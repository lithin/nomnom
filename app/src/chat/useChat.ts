import { useState } from "react";

import { sendChatHistory } from "./api";
import type { Message } from "./types";

export const useChat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
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
      const reply = await sendChatHistory(nextMessages);

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

  return {
    messages,
    input,
    isSending,
    setInput,
    handleSend,
  };
};
