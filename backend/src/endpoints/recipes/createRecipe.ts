import { getPrisma } from "../../shared/db";
import { embedText } from "../../shared/embeddings";
import { generateRecipeMetadata } from "./generateMetadata";

export const createRecipe = async ({
  title,
  recipe,
  chatId,
}: {
  title: string;
  recipe: string;
  chatId: string;
}) => {
  const embeddingString = await embedText(recipe);

  const prisma = getPrisma();

  const created = await prisma.recipe.create({
    data: { title, content: recipe, chatSessionId: chatId },
    select: { id: true },
  });

  await prisma.$executeRaw`UPDATE "Recipe" SET embedding = ${embeddingString}::vector WHERE id = ${created.id}`;

  generateRecipeMetadata(created.id, recipe);

  return created;
};
