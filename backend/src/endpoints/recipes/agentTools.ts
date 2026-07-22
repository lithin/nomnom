import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { saveRecipe } from "./save";
import { browseSavedRecipes, searchSavedRecipes } from "./searchRecipes";
import { updateRecipe } from "./updateRecipe";
import { updateRecipeTitle } from "./updateRecipeTitle";

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

export const findSavedRecipesTool = tool(
  async ({ dish }: { dish: string }) => {
    const results = await searchSavedRecipes(dish);
    if (results.length === 0) return "No saved recipes found.";
    return JSON.stringify(results);
  },
  {
    name: "findSavedRecipes",
    description:
      "Search the user's saved recipe collection for a specific dish. Returns candidate recipes as JSON with id, title, tags, contentSimilarity and tagSimilarity (0-1, higher is more similar). Use the id to build recipe links.",
    schema: z.object({
      dish: z.string().describe("The dish the user asked for, e.g. 'apple muffins'"),
    }),
  },
);

export const browseSavedRecipesTool = tool(
  async ({ theme }: { theme: string }) => {
    const results = await browseSavedRecipes(theme);
    if (results.length === 0) return "No saved recipes found.";
    return JSON.stringify(results);
  },
  {
    name: "browseSavedRecipes",
    description:
      "Browse the user's saved recipes by theme when they ask for open-ended ideas. Returns candidate recipes as JSON with id, title, tags and tagSimilarity (0-1, higher is more similar). Use the id to build recipe links.",
    schema: z.object({
      theme: z.string().describe("Short theme, e.g. 'dinner', 'baking', 'dessert', 'quick lunch'"),
    }),
  },
);

export const makeUpdateRecipeTitleTool = (chatId: string) =>
  tool(
    async ({ title }: { title: string }) => {
      await updateRecipeTitle({ chatId, title });
      return "Recipe title successfully updated.";
    },
    {
      name: "updateRecipeTitle",
      description: "Update only the title of an existing recipe in the database",
      schema: z.object({
        title: z.string().describe("The new title of the recipe."),
      }),
    },
  );
