import { getPrisma } from "../../shared/db";
import { UNSPLASH_IMAGE_HOST } from "./searchRecipeImages";

// Only image URLs served from Unsplash's image host may be persisted. The
// picker sources every candidate from there, so this keeps the PATCH endpoint
// from becoming an arbitrary-URL setter.
export const isAllowedImageUrl = (value: string): boolean => {
  try {
    return new URL(value).hostname === UNSPLASH_IMAGE_HOST;
  } catch {
    return false;
  }
};

export const updateRecipeImage = async (id: string, imageUrl: string) => {
  const prisma = getPrisma();

  const recipe = await prisma.recipe.findUnique({ where: { id }, select: { id: true } });
  if (!recipe) {
    return null;
  }

  return prisma.recipe.update({
    where: { id },
    data: { imageUrl },
    select: {
      id: true,
      title: true,
      content: true,
      imageUrl: true,
      createdAt: true,
      chatSessionId: true,
      tags: { select: { name: true } },
    },
  });
};
