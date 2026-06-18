import { AIMessage, HumanMessage } from "@langchain/core/messages";
import type { Request, Response, Router } from "express";
import { getErrorMessage } from "../../shared/utils";
import { createChatAgent, MODEL_NAME } from "./agent";
import {
  appendChatMessages,
  buildChatTitleFromFirstMessage,
  createChatSession,
  updateChatTitle,
} from "./chatHistory";
import type { ChatRequestBody } from "./types";

const extractReplyText = (content: unknown): string | null => {
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (!Array.isArray(content)) {
    return null;
  }

  // Gemini may return content blocks instead of a plain string.
  const textParts = content
    .map((item) => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const block = item as { text?: unknown; type?: unknown };
      if (block.type !== "text" || typeof block.text !== "string") {
        return null;
      }

      const trimmed = block.text.trim();
      return trimmed.length > 0 ? trimmed : null;
    })
    .filter((part): part is string => Boolean(part));

  if (textParts.length === 0) {
    return null;
  }

  return textParts.join("\n\n");
};

const getFinishReason = (message: unknown): string | null => {
  if (!message || typeof message !== "object" || !("response_metadata" in message)) {
    return null;
  }

  const metadata = (message as { response_metadata?: unknown }).response_metadata as
    | { finishReason?: unknown; finish_reason?: unknown }
    | undefined;

  if (typeof metadata?.finishReason === "string") {
    return metadata.finishReason;
  }

  if (typeof metadata?.finish_reason === "string") {
    return metadata.finish_reason;
  }

  return null;
};

export const setupChatEndpoint = (app: Router) => {
  app.post("/chat", async (_req: Request, res: Response) => {
    const body = _req.body as ChatRequestBody;
    const { messages, chatId: incomingChatId } = body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      res.status(500).json({ error: "GEMINI_API_KEY is not configured" });
      return;
    }

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: "messages is required" });
      return;
    }

    const latestMessage = messages[messages.length - 1];
    const latestText = latestMessage?.text?.trim();

    if (!latestText) {
      res.status(400).json({ error: "latest message text is required" });
      return;
    }

    try {
      const latestMessageTimestamp = new Date();
      let chatId = incomingChatId;
      let isNewChat = false;

      if (!chatId) {
        const createdSession = await createChatSession();
        chatId = createdSession.id;
        isNewChat = true;
      }

      await appendChatMessages([
        {
          chatId,
          role: "user",
          text: latestText,
          createdAt: latestMessageTimestamp,
        },
      ]);

      const agentMessages = messages.map((m) =>
        m.role === "user" ? new HumanMessage(m.text) : new AIMessage(m.text),
      );

      const agent = createChatAgent(chatId);
      let result = await agent.invoke({ messages: agentMessages });

      let lastMessage = result.messages[result.messages.length - 1];
      let reply = extractReplyText(lastMessage?.content);
      let finishReason = getFinishReason(lastMessage);

      if (!reply && finishReason === "MALFORMED_FUNCTION_CALL") {
        result = await agent.invoke({
          messages: [
            ...agentMessages,
            new HumanMessage(
              "Retry your previous step. If you call a tool, use valid JSON arguments with double-quoted keys and values.",
            ),
          ],
        });

        lastMessage = result.messages[result.messages.length - 1];
        reply = extractReplyText(lastMessage?.content);
        finishReason = getFinishReason(lastMessage);
      }

      if (!reply) {
        console.error("Could not generate response:", {
          finishReason,
          lastMessage,
          result,
        });
        res.status(200).json({ reply: "Could not generate response", model: MODEL_NAME });
        return;
      }

      await appendChatMessages([
        {
          chatId,
          role: "assistant",
          text: reply,
          createdAt: new Date(),
        },
      ]);

      if (isNewChat) {
        const title = buildChatTitleFromFirstMessage(latestText);
        await updateChatTitle({ chatId, title });
      }

      res.status(200).json({ reply, model: MODEL_NAME, chatId });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("Chat endpoint error:", message, error);
      res.status(500).json({ error: "error - check logs" });
    }
  });
};
