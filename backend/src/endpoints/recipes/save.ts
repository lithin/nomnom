import { GoogleGenAI } from "@google/genai";
import { createRecipeWithEmbedding } from "./createRecipe";
import { queueRecipeImageEnrichment } from "./enrichRecipeImage";

export const saveRecipe = async ({
  recipe,
  title,
  chatId,
}: {
  recipe: string;
  title: string;
  chatId: string;
}) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Generate an embedding for the recipe text
  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-001", // Standard Gemini embedding model available on v1beta
    contents: recipe,
    config: { outputDimensionality: 768 },
  });

  if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
    throw new Error("Failed to generate embedding for the recipe");
  }

  const embedding = embeddingResponse.embeddings[0].values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to extract embedding values");
  }

  const embeddingString = `[${embedding.join(",")}]`;

  const createdRecipe = await createRecipeWithEmbedding({
    title,
    recipe,
    chatId,
    embeddingString,
  });

  queueRecipeImageEnrichment(createdRecipe.id);

  return createdRecipe;
};
