import { createRecipe } from "./createRecipe";

export const saveRecipe = async ({
  recipe,
  title,
  chatId,
}: {
  recipe: string;
  title: string;
  chatId: string;
}) => {
  return createRecipe({ title, recipe, chatId });
};
