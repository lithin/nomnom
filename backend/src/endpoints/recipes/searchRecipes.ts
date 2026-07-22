import { getPrisma } from "../../shared/db";
import { embedText } from "../../shared/embeddings";

export type RecipeMatch = {
  id: string;
  title: string;
  tags: string[];
  contentSimilarity: number;
  tagSimilarity: number;
};

// Hybrid search for a specific dish: scores every recipe on both content-embedding
// similarity and best tag-embedding similarity. Recipe embeddings cover the full
// body without the title, so short queries underscore exact matches — tags compensate.
export const searchSavedRecipes = async (query: string): Promise<RecipeMatch[]> => {
  const vector = await embedText(query);
  const prisma = getPrisma();

  return prisma.$queryRaw<RecipeMatch[]>`
    SELECT
      r.id,
      r.title,
      COALESCE(ARRAY_AGG(t.name) FILTER (WHERE t.name IS NOT NULL), '{}') AS tags,
      ROUND((1 - (r.embedding <=> ${vector}::vector))::numeric, 3)::float AS "contentSimilarity",
      ROUND(COALESCE(MAX(1 - (t.embedding <=> ${vector}::vector)), 0)::numeric, 3)::float AS "tagSimilarity"
    FROM "Recipe" r
    LEFT JOIN "_RecipeToTag" rt ON rt."A" = r.id
    LEFT JOIN "Tag" t ON t.id = rt."B" AND t.embedding IS NOT NULL
    WHERE r.embedding IS NOT NULL
    GROUP BY r.id, r.title, r.embedding
    ORDER BY GREATEST(
      1 - (r.embedding <=> ${vector}::vector),
      COALESCE(MAX(1 - (t.embedding <=> ${vector}::vector)), 0)
    ) DESC
    LIMIT 5
  `;
};

export type RecipeBrowseResult = {
  id: string;
  title: string;
  tags: string[];
  tagSimilarity: number;
};

// Idea browsing by theme: tag embeddings only — short-text-vs-short-text comparison
// ("dinner" vs tag "main course"), which full recipe embeddings handle poorly.
// Untagged recipes are excluded; acceptable for the ideas case.
export const browseSavedRecipes = async (theme: string): Promise<RecipeBrowseResult[]> => {
  const vector = await embedText(theme);
  const prisma = getPrisma();

  return prisma.$queryRaw<RecipeBrowseResult[]>`
    SELECT
      r.id,
      r.title,
      ARRAY_AGG(DISTINCT t.name) AS tags,
      ROUND(MAX(1 - (t.embedding <=> ${vector}::vector))::numeric, 3)::float AS "tagSimilarity"
    FROM "Recipe" r
    JOIN "_RecipeToTag" rt ON rt."A" = r.id
    JOIN "Tag" t ON t.id = rt."B"
    WHERE t.embedding IS NOT NULL
    GROUP BY r.id, r.title
    ORDER BY "tagSimilarity" DESC
    LIMIT 6
  `;
};
