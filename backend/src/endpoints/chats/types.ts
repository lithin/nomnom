export type ChatSession = {
  id: string;
  title: string;
  createdAt: Date;
};

export type ChatSessionPage = {
  chats: ChatSession[];
  totalCount: number;
};
