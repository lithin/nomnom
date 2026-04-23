import { GoogleGenAI } from "@google/genai";
import type { Request, Response, Router } from "express";
import {
  appendChatMessages,
  buildChatTitleFromFirstMessage,
  createChatSession,
  updateChatTitle,
} from "./chatHistory";
import { saveRecipe, saveRecipeDeclaration } from "./save";
import type { ChatRequestBody } from "./types";
import { updateRecipe, updateRecipeDeclaration } from "./updateRecipe";
import { getErrorMessage } from "./utils";

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

    // Convert messages to SDK format for history
    const history = messages.slice(0, -1).map((message) => ({
      role: message.role === "assistant" ? "model" : "user",
      parts: [{ text: message.text }],
    }));

    // Get the latest user message
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

      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-2.5-flash";

      const chat = ai.chats.create({
        model: modelName,
        history,
        config: {
          systemInstruction: `
        You are a recipe assistant to a mother of two small children (baby and toddler) and a wife to a very hungry weight-lifting husband.
        Toddler eats everything and quite a lot. Baby is doing baby led weaning.
        She loves cooking and baking. She is a foodie who used to live in London and got used to eating delicious foods from all kinds of world cuisines.
        She also travelled broadly and loves different cuisines, her favourite being Japanese, Thai, Indian, Peruvian, Mexican. Trying out new recipes from any part of the world is always fun.
        She's originally from the Czech Republic and likes dishes that remind her of her childhood.
        She likes concise responses, but with detailed recipes when asked for. She likes ideating fun new recipes.
        When ideating, offer several options (short versions & descriptions only, no other text).
        When creating an actual recipe, ensure only exactly these things are in your response: title, servings, nutrition per serving, ingredients, instructions.
        When updating an existing recipe, state what was changed. Keep the recipe in exactly the same format. Wait to use the update recipe tool until you get confirmation.
        `,
          tools: [{ functionDeclarations: [saveRecipeDeclaration, updateRecipeDeclaration] }],
        },
      });

      let response = await chat.sendMessage({ message: latestText });

      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponseParts = [];

        for (const call of response.functionCalls) {
          if (call.name === "saveRecipe") {
            const args = call.args as unknown as { recipe: string; title: string };
            await saveRecipe({ ...args, chatId });

            functionResponseParts.push({
              functionResponse: {
                name: call.name,
                response: { result: "Recipe successfully saved." },
              },
            });
          }
          if (call.name === "updateRecipe") {
            const args = call.args as unknown as {
              id?: string;
              recipe: string;
              title: string;
            };

            await updateRecipe({
              id: args.id,
              chatId,
              recipe: args.recipe,
              title: args.title,
            });

            functionResponseParts.push({
              functionResponse: {
                name: call.name,
                response: { result: "Recipe successfully updated." },
              },
            });
          }
        }

        if (functionResponseParts.length > 0) {
          // Send the function execution results back to the model
          response = await chat.sendMessage({ message: functionResponseParts });
        }
      }

      if (!response.text) {
        console.error("Could not generate response:", response);
        res.status(200).json({ reply: "could not generate response", model: modelName });
        return;
      }

      const reply = response.text;

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

      res.status(200).json({ reply, model: modelName, chatId });
    } catch (error) {
      const message = getErrorMessage(error);
      console.error("Chat endpoint error:", message, error);
      res.status(500).json({ error: "error - check logs" });
    }
  });
};
