import { getPrisma } from "../../shared/db";

type CreateRecipeWithEmbeddingParams = {
  title: string;
  recipe: string;
  chatId: string;
  embeddingString: string;
};

export const createRecipeWithEmbedding = async ({
  title,
  recipe,
  chatId,
  embeddingString,
}: CreateRecipeWithEmbeddingParams) => {
  const prisma = getPrisma();

  const createdRecipe = await prisma.recipe.create({
    data: {
      title,
      content: recipe,
      chatSessionId: chatId,
    },
    select: {
      id: true,
    },
  });

  await prisma.$executeRaw`
    UPDATE "Recipe"
    SET embedding = ${embeddingString}::vector
    WHERE id = ${createdRecipe.id}
  `;

  return createdRecipe;
};
