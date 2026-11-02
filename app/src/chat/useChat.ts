import { useCallback, useRef, useState } from "react";

import { getChatMessages, sendChatHistory } from "./api";
import type { Message } from "./types";

export const useChat = (initialMessages: Message[] = [], initialChatId?: string) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [chatId, setChatId] = useState<string | undefined>(initialChatId);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isHydrating, setIsHydrating] = useState(false);
  const activeHydrationRequestId = useRef(0);

  const handleSend = async () => {
    const trimmedInput = input.trim();

    if (!trimmedInput || isSending) {
      return;
    }

    const nextMessages: Message[] = [
      ...messages,
      {
        id: `${Date.now()}-user`,
        role: "user",
        text: trimmedInput,
        createdAt: new Date().toISOString(),
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const result = await sendChatHistory(nextMessages, chatId);

      if (result.chatId) {
        setChatId(result.chatId);
      }

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: result.reply,
          createdAt: new Date().toISOString(),
        },
      ]);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Unknown error";

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: `Error: ${errorText}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setChatId(undefined);
    setInput("");
    setIsSending(false);
  };

  const hydrateChat = useCallback((nextMessages: Message[], nextChatId?: string) => {
    activeHydrationRequestId.current += 1;
    setMessages(nextMessages);
    setChatId(nextChatId);
    setInput("");
    setIsSending(false);
    setIsHydrating(false);
  }, []);

  const loadChatById = useCallback(async (nextChatId?: string) => {
    const requestId = activeHydrationRequestId.current + 1;
    activeHydrationRequestId.current = requestId;

    if (!nextChatId) {
      setMessages([]);
      setChatId(undefined);
      setInput("");
      setIsSending(false);
      setIsHydrating(false);
      return;
    }

    setMessages([]);
    setChatId(nextChatId);
    setInput("");
    setIsSending(false);
    setIsHydrating(true);

    try {
      const persistedMessages = await getChatMessages(nextChatId);

      if (activeHydrationRequestId.current !== requestId) {
        return;
      }

      setMessages(persistedMessages);
    } catch (error) {
      if (activeHydrationRequestId.current !== requestId) {
        return;
      }

      const errorText = error instanceof Error ? error.message : "Unknown error";
      setMessages([
        {
          id: `${Date.now()}-assistant-error`,
          role: "assistant",
          text: `Error: ${errorText}`,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      if (activeHydrationRequestId.current === requestId) {
        setIsHydrating(false);
      }
    }
  }, []);

  return {
    messages,
    chatId,
    input,
    isSending,
    isHydrating,
    setInput,
    handleSend,
    startNewChat,
    hydrateChat,
    loadChatById,
  };
};
