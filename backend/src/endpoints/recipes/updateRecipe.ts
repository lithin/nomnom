import { GoogleGenAI } from "@google/genai";
import { getPrisma } from "../../shared/db";
import { createRecipeWithEmbedding } from "./createRecipe";
import { getOrCreateRecipe } from "./getOrCreateRecipe";

export const updateRecipe = async ({
  id,
  chatId,
  recipe,
  title,
}: {
  id?: string;
  chatId: string;
  recipe: string;
  title: string;
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

  if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
    throw new Error("Failed to generate embedding for the recipe");
  }

  const embedding = embeddingResponse.embeddings[0]?.values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to extract embedding values");
  }

  const embeddingString = `[${embedding.join(",")}]`;

  const prisma = getPrisma();
  const { recipe: resolvedRecipe, created } = await getOrCreateRecipe({
    id,
    chatId,
    createRecipe: () =>
      createRecipeWithEmbedding({
        title,
        recipe,
        chatId,
        embeddingString,
      }),
  });

  if (created) {
    return 1;
  }

  const updatedRecipe = await prisma.$executeRaw`
    UPDATE "Recipe"
    SET title = ${title},
        content = ${recipe},
        embedding = ${embeddingString}::vector
    WHERE id = ${resolvedRecipe.id}
  `;

  if (updatedRecipe === 0) {
    await createRecipeWithEmbedding({
      title,
      recipe,
      chatId,
      embeddingString,
    });
    return 1;
  }

  return updatedRecipe;
};
