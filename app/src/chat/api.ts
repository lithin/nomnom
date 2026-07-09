import { fetchWithLogging, getBackendHeaders, getBackendUrl } from "../backend/apiConfig";
import type { ChatHistoryItem, Message } from "./types";

const readJsonOrThrow = async <T>(response: Response, requestLabel: string): Promise<T> => {
  const contentType = response.headers.get("content-type") ?? "";
  const text = await response.text();

  if (!response.ok) {
    throw new Error(
      `${requestLabel} failed (${response.status}) from ${response.url}: ${text || "no response body"}`,
    );
  }

  if (!contentType.includes("application/json")) {
    throw new Error(
      `${requestLabel} returned non-JSON response from ${response.url} (content-type: ${contentType || "unknown"}): ${text.slice(0, 200)}`,
    );
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${requestLabel} returned invalid JSON from ${response.url}: ${text.slice(0, 200)}`,
    );
  }
};

export const sendChatHistory = async (messages: Message[], chatId?: string) => {
  const response = await fetchWithLogging(`${getBackendUrl()}/chat`, {
    method: "POST",
    headers: getBackendHeaders(),
    body: JSON.stringify({
      messages: messages.map((message) => ({
        role: message.role,
        text: message.text,
      })),
      chatId,
    }),
  });

  const body = await readJsonOrThrow<{ reply?: string; chatId?: string }>(
    response,
    "Send chat message",
  );

  return {
    reply: body.reply?.trim() || "I could not generate a response.",
    chatId: body.chatId,
  };
};

export const getChatsPage = async ({ limit, offset }: { limit: number; offset: number }) => {
  const response = await fetchWithLogging(
    `${getBackendUrl()}/chats?limit=${limit}&offset=${offset}`,
    {
      headers: getBackendHeaders(),
    },
  );

  const body = await readJsonOrThrow<{
    chats?: Array<{ id: string; title: string; createdAt: string }>;
    totalCount?: number;
    hasMore?: boolean;
  }>(response, "Fetch chat history");

  return {
    chats: (body.chats ?? []) as ChatHistoryItem[],
    totalCount: body.totalCount ?? 0,
    hasMore: body.hasMore ?? false,
  };
};

export const getChatMessages = async (chatId: string) => {
  const response = await fetchWithLogging(`${getBackendUrl()}/chats/${chatId}/messages`, {
    headers: getBackendHeaders(),
  });

  const body = await readJsonOrThrow<{
    messages?: Array<{
      id: string;
      chatId: string;
      role: "user" | "assistant";
      text: string;
      createdAt: string;
    }>;
  }>(response, "Fetch chat messages");

  return (body.messages ?? []).map((message) => ({
    id: message.id,
    role: message.role,
    text: message.text,
    createdAt: message.createdAt,
  }));
};
