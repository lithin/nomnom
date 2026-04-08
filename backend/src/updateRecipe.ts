import { type FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import { getPrisma } from "./db";

export const updateRecipeDeclaration: FunctionDeclaration = {
  name: "updateRecipe",
  parametersJsonSchema: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: "The id of the recipe to update",
      },
      recipe: {
        type: Type.STRING,
        description: "The updated recipe to save.",
      },
      title: {
        type: Type.STRING,
        description: "The updated title of the recipe.",
      },
    },
    required: ["recipe", "title"],
  },
};

export const updateRecipe = async ({
  id,
  recipe,
  title,
}: {
  id: string;
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

  const updatedRecipe = await prisma.$executeRaw`
    UPDATE "Recipe"
    SET title = ${title},
        content = ${recipe},
        embedding = ${embeddingString}::vector
    WHERE id = ${id}
  `;

  if (updatedRecipe === 0) {
    throw new Error(`Recipe not found for id: ${id}`);
  }

  return updatedRecipe;
};
