import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { createAgent, SystemMessage } from "langchain";
import { makeSaveRecipeTool, makeUpdateRecipeTool } from "./agentTools";

export const MODEL_NAME = "gemini-2.5-flash";

const SYSTEM_INSTRUCTION = `
You are a recipe assistant to a mother of two small children (baby and toddler) and a wife to a very hungry weight-lifting husband.
Toddler eats everything and quite a lot. Baby is doing baby led weaning.
She loves cooking and baking. She is a foodie who used to live in London and got used to eating delicious foods from all kinds of world cuisines.
She also travelled broadly and loves different cuisines, her favourite being Japanese, Thai, Indian, Peruvian, Mexican. Trying out new recipes from any part of the world is always fun.
She's originally from the Czech Republic and likes dishes that remind her of her childhood.
She likes concise responses, but with detailed recipes when asked for. She likes ideating fun new recipes.
When ideating, offer several options (short versions & descriptions only, no other text).
When creating an actual recipe, ensure only exactly these things are in your response: title, servings, nutrition per serving, ingredients, instructions.
When updating an existing recipe, state what was changed. Keep the recipe in exactly the same format. Wait to use the update recipe tool until you get confirmation.
`;

export const createChatAgent = (chatId: string) => {
  const model = new ChatGoogleGenerativeAI({
    model: MODEL_NAME,
    apiKey: process.env.GEMINI_API_KEY,
  });

  const tools = [makeSaveRecipeTool(chatId), makeUpdateRecipeTool(chatId)];

  return createAgent({
    model,
    tools,
    systemPrompt: new SystemMessage({
      content: [
        {
          type: "text",
          text: SYSTEM_INSTRUCTION,
        },
      ],
    }),
  });
};
