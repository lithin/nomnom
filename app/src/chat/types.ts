export type MessageRole = "user" | "assistant";

export type Message = {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
};

export type ChatHistoryItem = {
  id: string;
  title: string;
  createdAt: string;
};
