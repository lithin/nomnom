import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { saveRecipe } from "./save";
import { updateRecipe } from "./updateRecipe";

export const makeSaveRecipeTool = (chatId: string) =>
  tool(
    async ({ recipe, title }: { recipe: string; title: string }) => {
      await saveRecipe({ recipe, title, chatId });
      return "Recipe successfully saved.";
    },
    {
      name: "saveRecipe",
      description: "Save a recipe to the database",
      schema: z.object({
        recipe: z
          .string()
          .describe(
            "The recipe to save, as presented in the latest relevant message - without title.",
          ),
        title: z
          .string()
          .describe("The title of the recipe to be saved. Keep it short and descriptive."),
      }),
    },
  );

export const makeUpdateRecipeTool = (chatId: string) =>
  tool(
    async ({ id, recipe, title }: { id?: string; recipe: string; title: string }) => {
      await updateRecipe({ id, chatId, recipe, title });
      return "Recipe successfully updated.";
    },
    {
      name: "updateRecipe",
      description: "Update an existing recipe in the database",
      schema: z.object({
        id: z.string().optional().describe("The id of the recipe to update"),
        recipe: z.string().describe("The updated recipe to save."),
        title: z.string().describe("The updated title of the recipe."),
      }),
    },
  );
