import { getPrisma } from "../../shared/db";
import { getErrorMessage } from "../../shared/utils";

const searchRecipeImageUrl = async (title: string): Promise<string | null> => {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;

  if (!accessKey) {
    throw new Error("UNSPLASH_ACCESS_KEY is not configured");
  }

  const params = new URLSearchParams({
    query: title,
    per_page: "1",
    orientation: "landscape",
  });

  const response = await fetch(`https://api.unsplash.com/search/photos?${params.toString()}`, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Unsplash image search failed with status ${response.status}`);
  }

  const payload = (await response.json()) as {
    results?: Array<{ urls?: { regular?: string } }>;
  };

  return payload.results?.[0]?.urls?.regular ?? null;
};

export const runRecipeImageEnrichment = async (recipeId: string) => {
  const prisma = getPrisma();

  const recipe = await prisma.recipe.findUnique({
    where: { id: recipeId },
    select: {
      id: true,
      title: true,
      imageUrl: true,
    },
  });

  if (!recipe || recipe.imageUrl) {
    return;
  }

  const imageUrl = await searchRecipeImageUrl(recipe.title);

  if (!imageUrl) {
    return;
  }

  await prisma.recipe.update({
    where: { id: recipe.id },
    data: { imageUrl },
  });
};

export const queueRecipeImageEnrichment = (recipeId: string) => {
  setImmediate(() => {
    void runRecipeImageEnrichment(recipeId).catch((error) => {
      console.error(`Failed to enrich image for recipe ${recipeId}: ${getErrorMessage(error)}`);
    });
  });
};
