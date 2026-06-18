import type { Request, Response, Router } from "express";
import { getChatMessages, listChatSessions } from "../chat/chatHistory";

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return fallback;
  }

  return Math.floor(parsed);
};

export const setupChatsEndpoint = (app: Router) => {
  app.get("/chats", async (req: Request, res: Response) => {
    const limit = Math.min(parsePositiveInt(req.query.limit as string | undefined, 10), 50);
    const offset = parsePositiveInt(req.query.offset as string | undefined, 0);

    try {
      const result = await listChatSessions({ limit, offset });

      res.status(200).json({
        chats: result.chats,
        totalCount: result.totalCount,
        hasMore: offset + result.chats.length < result.totalCount,
      });
    } catch (error) {
      console.error("Error fetching chats:", error);
      res.status(500).json({ error: "Failed to fetch chats" });
    }
  });

  app.get("/chats/:chatId/messages", async (req: Request, res: Response) => {
    const { chatId } = req.params;

    if (typeof chatId !== "string" || chatId.length === 0) {
      res.status(400).json({ error: "Invalid chat ID" });
      return;
    }

    try {
      const messages = await getChatMessages(chatId);

      if (messages === null) {
        res.status(404).json({ error: "Chat not found" });
        return;
      }

      res.status(200).json({ messages });
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });
};
