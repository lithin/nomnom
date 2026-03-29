import { type FunctionDeclaration, GoogleGenAI, Type } from "@google/genai";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "./generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const saveRecipeDeclaration: FunctionDeclaration = {
  name: "saveRecipe",
  parametersJsonSchema: {
    type: Type.OBJECT,
    properties: {
      recipe: {
        type: Type.STRING,
        description: "The recipe to save, as presented in the latest relevant message.",
      },
    },
    required: ["recipe"],
  },
};

export const saveRecipe = async ({ recipe }: { recipe: string }) => {
  console.log("Saving recipe:", recipe);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  // Generate an embedding for the recipe text
  const embeddingResponse = await ai.models.embedContent({
    model: "text-embedding-004", // Standard Gemini embedding model
    contents: recipe,
  });

  if (!embeddingResponse.embeddings || embeddingResponse.embeddings.length === 0) {
    throw new Error("Failed to generate embedding for the recipe");
  }

  const embedding = embeddingResponse.embeddings[0].values;

  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to extract embedding values");
  }

  // Save the recipe and its embedding to the database using Prisma
  const savedRecipe = await prisma.$queryRaw`
    INSERT INTO "Recipe" (id, content, embedding, "createdAt")
    VALUES (gen_random_uuid(), ${recipe}, ${embedding}::vector, NOW())
    RETURNING id;
  `;

  console.log("Successfully saved recipe with ID:", savedRecipe);
  return savedRecipe;
};
