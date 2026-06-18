import { getPrisma } from "../../shared/db";
import { queueRecipeImageEnrichment } from "./enrichRecipeImage";
import { getOrCreateRecipe } from "./getOrCreateRecipe";

export const updateRecipeTitle = async ({ chatId, title }: { chatId: string; title: string }) => {
  const prisma = getPrisma();
  const { recipe: resolvedRecipe, created } = await getOrCreateRecipe({
    chatId,
    createRecipe: () =>
      prisma.recipe.create({
        data: {
          title,
          content: "",
          chatSessionId: chatId,
        },
        select: {
          id: true,
        },
      }),
  });

  if (created) {
    queueRecipeImageEnrichment(resolvedRecipe.id);
    return {
      id: resolvedRecipe.id,
      title,
    };
  }

  const updated = await prisma.recipe.update({
    where: { id: resolvedRecipe.id },
    data: { imageUrl: null, title },
    select: {
      id: true,
      title: true,
    },
  });

  queueRecipeImageEnrichment(updated.id);

  return updated;
};
