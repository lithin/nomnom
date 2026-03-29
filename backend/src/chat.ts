import { GoogleGenAI } from "@google/genai";
import type { Request, Response, Router } from "express";
import { saveRecipe, saveRecipeDeclaration } from "./save";
import type { ChatRequestBody } from "./types";
import { getErrorMessage } from "./utils";

export const setupChatEndpoint = (app: Router) => {
  app.post("/chat", async (_req: Request, res: Response) => {
    const body = _req.body as ChatRequestBody;
    const { messages } = body;
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
        `,
          tools: [{ functionDeclarations: [saveRecipeDeclaration] }],
        },
      });

      let response = await chat.sendMessage({ message: latestText });
      console.log("AI response:", response);

      // Handle function calls
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionResponseParts = [];
        
        for (const call of response.functionCalls) {
          if (call.name === "saveRecipe") {
            const args = call.args as unknown as { recipe: string };
            await saveRecipe(args);
            
            functionResponseParts.push({
              functionResponse: {
                name: call.name,
                response: { result: "Recipe successfully saved." },
              },
            });
          }
        }

        if (functionResponseParts.length > 0) {
          // Send the function execution results back to the model
          response = await chat.sendMessage({ message: functionResponseParts });
        }
      }

      const reply = response.text || "I could not generate a response.";

      res.status(200).json({ reply, model: modelName });
    } catch (error) {
      const message = getErrorMessage(error);
      res.status(500).json({ error: message });
    }
  });
};
