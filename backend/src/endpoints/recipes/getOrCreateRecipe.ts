import { getPrisma } from "../../shared/db";

type RecipeReference = {
  id: string;
};

export const getOrCreateRecipe = async ({
  id,
  chatId,
  createRecipe,
}: {
  id?: string;
  chatId: string;
  createRecipe: () => Promise<RecipeReference>;
}) => {
  const prisma = getPrisma();

  if (id) {
    const uniqueRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (uniqueRecipe) {
      return { recipe: uniqueRecipe, created: false };
    }
  }

  const latestRecipe = await prisma.recipe.findFirst({
    where: { chatSessionId: chatId },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (latestRecipe) {
    return { recipe: latestRecipe, created: false };
  }

  const createdRecipe = await createRecipe();

  return { recipe: createdRecipe, created: true };
};
