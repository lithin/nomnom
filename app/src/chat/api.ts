import { Platform } from "react-native";

import type { Message } from "./types";

const getBackendUrl = () => {
  if (Platform.OS === "android") {
    return "http://10.0.2.2:8080";
  }

  return "http://localhost:8080";
};

export const sendChatHistory = async (messages: Message[]) => {
  const response = await fetch(`${getBackendUrl()}/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: messages.map((message) => ({
        role: message.role,
        text: message.text,
      })),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(errorBody || "Failed to send chat message");
  }

  const body = (await response.json()) as { reply?: string };
  return body.reply?.trim() || "I could not generate a response.";
};
