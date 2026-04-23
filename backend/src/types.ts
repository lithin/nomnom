export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ChatRequestBody = {
  messages?: ChatMessage[];
  chatId?: string;
};

export type ChatRole = "user" | "assistant";

export type PersistedChatMessage = {
  id: string;
  chatId: string;
  role: ChatRole;
  text: string;
  createdAt: Date;
};

export type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
};

export type ChatSessionPage = {
  chats: ChatSession[];
  totalCount: number;
};
