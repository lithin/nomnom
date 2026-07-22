import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIMENSIONS = 768;

// Returns the embedding as a pgvector literal string, e.g. "[0.1,0.2,...]"
export const embedText = async (text: string): Promise<string> => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const embeddingResponse = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: { outputDimensionality: EMBEDDING_DIMENSIONS },
  });

  const embedding = embeddingResponse.embeddings?.[0]?.values;
  if (!embedding || embedding.length === 0) {
    throw new Error("Failed to generate embedding");
  }

  return `[${embedding.join(",")}]`;
};
