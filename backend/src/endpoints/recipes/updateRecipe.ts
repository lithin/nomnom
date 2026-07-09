import { GoogleGenAI } from "@google/genai";
import { getPrisma } from "../../shared/db";
import { createRecipe } from "./createRecipe";
import { generateRecipeMetadata } from "./generateMetadata";
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

  const embedding = embeddingResponse.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to extract embedding values");
  }

  const embeddingString = `[${embedding.join(",")}]`;

  const prisma = getPrisma();
  const { recipe: resolvedRecipe, created } = await getOrCreateRecipe({
    id,
    chatId,
    createRecipe: () => createRecipe({ title, recipe, chatId }),
  });

  if (created) {
    return 1;
  }

  const updatedCount = await prisma.$executeRaw`
    UPDATE "Recipe"
    SET title = ${title},
        content = ${recipe},
        embedding = ${embeddingString}::vector
    WHERE id = ${resolvedRecipe.id}
  `;

  if (updatedCount === 0) {
    await createRecipe({ title, recipe, chatId });
    return 1;
  }

  generateRecipeMetadata(resolvedRecipe.id, recipe);

  return updatedCount;
};
