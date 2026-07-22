import { getPrisma } from "../../shared/db";
import { embedText } from "../../shared/embeddings";
import { createRecipe } from "./createRecipe";
import { generateRecipeMetadata } from "./generateMetadata";
import { getOrCreateRecipe } from "./getOrCreateRecipe";

export const updateRecipe = async ({
  id,
  chatId,
  recipe,
  title,
}: {
  id?: string;
  chatId: string;
  recipe: string;
  title: string;
}) => {
  const embeddingString = await embedText(recipe);

  const prisma = getPrisma();
  const { recipe: resolvedRecipe, created } = await getOrCreateRecipe({
    id,
    chatId,
    createRecipe: () => createRecipe({ title, recipe, chatId }),
  });

  if (created) {
    return 1;
  }

  const updatedCount = await prisma.$executeRaw`
    UPDATE "Recipe"
    SET title = ${title},
        content = ${recipe},
        embedding = ${embeddingString}::vector
    WHERE id = ${resolvedRecipe.id}
  `;

  if (updatedCount === 0) {
    await createRecipe({ title, recipe, chatId });
    return 1;
  }

  generateRecipeMetadata(resolvedRecipe.id, recipe);

  return updatedCount;
};
