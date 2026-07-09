import { GoogleGenAI } from "@google/genai";
import { getPrisma } from "../../shared/db";
import { getErrorMessage } from "../../shared/utils";
import { queueRecipeImageEnrichment } from "./enrichRecipeImage";

const generateTagNames = async (content: string, ai: GoogleGenAI): Promise<string[]> => {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Generate 1 to 5 short tags for this recipe. Return only a JSON array of strings, no other text. Tags should be concise (1-2 words) and useful for categorization (e.g. cuisine type, meal type, main ingredient, dietary notes).\n\nRecipe:\n${content}`,
  });

  const text = response.text?.trim() ?? "[]";
  const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) throw new Error("Expected array of tags");
  return (parsed as unknown[]).slice(0, 5).map(String);
};

const upsertTag = async (name: string, ai: GoogleGenAI): Promise<string> => {
  const prisma = getPrisma();

  const existing = await prisma.tag.findUnique({ where: { name }, select: { id: true } });
  if (existing) return existing.id;

  const embeddingResponse = await ai.models.embedContent({
    model: "gemini-embedding-001",
    contents: name,
    config: { outputDimensionality: 768 },
  });

  const embedding = embeddingResponse.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) throw new Error(`Failed to embed tag: ${name}`);

  const embeddingString = `[${embedding.join(",")}]`;

  const created = await prisma.tag.create({ data: { name }, select: { id: true } });

  await prisma.$executeRaw`UPDATE "Tag" SET embedding = ${embeddingString}::vector WHERE id = ${created.id}`;

  return created.id;
};

const generateAndSaveTags = async (recipeId: string, content: string): Promise<void> => {
  if (!process.env.GEMINI_API_KEY) return;

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const prisma = getPrisma();

  const tagNames = await generateTagNames(content, ai);
  const tagIds = await Promise.all(tagNames.map((name) => upsertTag(name, ai)));

  await prisma.recipe.update({
    where: { id: recipeId },
    data: { tags: { set: tagIds.map((id) => ({ id })) } },
  });
};

export const generateRecipeMetadata = (recipeId: string, content: string): void => {
  queueRecipeImageEnrichment(recipeId);

  setImmediate(() => {
    void generateAndSaveTags(recipeId, content).catch((error) => {
      console.error(`Failed to generate tags for recipe ${recipeId}: ${getErrorMessage(error)}`);
    });
  });
};
