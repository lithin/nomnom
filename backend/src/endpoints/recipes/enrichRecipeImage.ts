import { getPrisma } from "../../shared/db";
import { getErrorMessage } from "../../shared/utils";
import { searchRecipeImages } from "./searchRecipeImages";

const searchRecipeImageUrl = async (title: string): Promise<string | null> => {
  const [first] = await searchRecipeImages(title, 1);
  return first?.fullUrl ?? null;
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
