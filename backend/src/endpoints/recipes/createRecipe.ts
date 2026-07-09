import { GoogleGenAI } from "@google/genai";
import { getPrisma } from "../../shared/db";
import { generateRecipeMetadata } from "./generateMetadata";

export const createRecipe = async ({
  title,
  recipe,
  chatId,
}: {
  title: string;
  recipe: string;
  chatId: string;
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: recipe,
    config: { outputDimensionality: 768 },
  });

  const embedding = embeddingResponse.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to generate embedding for the recipe");
  }

  const embeddingString = `[${embedding.join(",")}]`;

  const prisma = getPrisma();

  const created = await prisma.recipe.create({
    data: { title, content: recipe, chatSessionId: chatId },
    select: { id: true },
  });

  await prisma.$executeRaw`UPDATE "Recipe" SET embedding = ${embeddingString}::vector WHERE id = ${created.id}`;

  generateRecipeMetadata(created.id, recipe);

  return created;
};
