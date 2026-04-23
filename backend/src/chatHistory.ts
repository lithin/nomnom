import { getPrisma } from "./db";
import type { ChatRole, PersistedChatMessage } from "./types";

type ChatMessageInput = {
  chatId: string;
  role: ChatRole;
  text: string;
  createdAt?: Date;
};

export const createChatSession = async () => {
  const prisma = getPrisma();

  const session = await prisma.chatSession.create({
    data: { title: "New chat" },
    select: { id: true, createdAt: true },
  });

  return session;
};

export const appendChatMessages = async (messages: ChatMessageInput[]) => {
  if (messages.length === 0) {
    return;
  }

  const prisma = getPrisma();

  await prisma.chatMessage.createMany({
    data: messages.map((message) => ({
      chatId: message.chatId,
      role: message.role,
      text: message.text,
      createdAt: message.createdAt ?? new Date(),
    })),
  });
};

export const updateChatTitle = async ({ chatId, title }: { chatId: string; title: string }) => {
  const prisma = getPrisma();

  await prisma.chatSession.update({
    where: { id: chatId },
    data: { title },
  });
};

export const listChatSessions = async ({ limit, offset }: { limit: number; offset: number }) => {
  const prisma = getPrisma();

  const [page, totalCount] = await Promise.all([
    prisma.chatSession.findMany({
      select: { id: true, title: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.chatSession.count(),
  ]);

  return { chats: page, totalCount };
};

export const getChatMessages = async (chatId: string) => {
  const prisma = getPrisma();

  const session = await prisma.chatSession.findUnique({
    where: { id: chatId },
    select: { id: true },
  });

  if (!session) {
    return null;
  }

  const messages = await prisma.chatMessage.findMany({
    where: { chatId },
    orderBy: { createdAt: "asc" },
    select: { id: true, chatId: true, role: true, text: true, createdAt: true },
  });

  return messages as PersistedChatMessage[];
};

export const buildChatTitleFromFirstMessage = (firstUserText: string) => {
  const normalized = firstUserText
    .trim()
    .replace(/\s+/g, " ")
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/^[#>*\-\d.\s]+/, "");

  if (!normalized) {
    return "New chat";
  }

  if (normalized.length <= 80) {
    return normalized;
  }

  return `${normalized.slice(0, 77)}...`;
};
