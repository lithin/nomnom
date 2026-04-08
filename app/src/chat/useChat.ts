import { useCallback, useState } from "react";

import { sendChatHistory } from "./api";
import type { Message } from "./types";

export const useChat = (initialMessages: Message[] = [], initialEditingRecipeId?: string) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [editingRecipeId, setEditingRecipeId] = useState<string | undefined>(
    initialEditingRecipeId,
  );
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);

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
      },
    ];

    setMessages(nextMessages);
    setInput("");
    setIsSending(true);

    try {
      const reply = await sendChatHistory(nextMessages, editingRecipeId);

      setMessages((previous) => [
        ...previous,
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          text: reply,
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
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setEditingRecipeId(undefined);
    setInput("");
    setIsSending(false);
  };

  const hydrateChat = useCallback((nextMessages: Message[], nextEditingRecipeId?: string) => {
    setMessages(nextMessages);
    setEditingRecipeId(nextEditingRecipeId);
    setInput("");
    setIsSending(false);
  }, []);

  return {
    messages,
    input,
    isSending,
    setInput,
    handleSend,
    startNewChat,
    hydrateChat,
  };
};
