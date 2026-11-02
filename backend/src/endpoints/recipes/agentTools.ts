import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { type ImportFailureReason, importRecipe, type PrefetchedPage } from "./importRecipe";
import { saveRecipe } from "./save";
import { browseSavedRecipes, searchSavedRecipes } from "./searchRecipes";
import { updateRecipe } from "./updateRecipe";
import { updateRecipeTitle } from "./updateRecipeTitle";

export const makeSaveRecipeTool = (chatId: string) =>
  tool(
    async ({ recipe, title }: { recipe: string; title: string }) => {
      const { id } = await saveRecipe({ recipe, title, chatId });
      // Hand the model a ready-made link so its confirmation can point at the
      // saved recipe. The app renders recipe:// links and opens the detail
      // screen on tap (see MessageList / RecipeDetails).
      return `Recipe successfully saved. Include this link in your reply so the user can open it: [${title}](recipe://${id})`;
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

// Reads a recipe from a URL's schema.org JSON-LD. Returns the structured
// fields we found (not a saved recipe) so the agent can present them in the
// house format, estimate only what's missing, and save via saveRecipe once the
// user confirms. When the link has no usable recipe data, returns a plain
// message (per failure reason) the agent relays to the user.
const IMPORT_FAILURE_MESSAGES: Record<ImportFailureReason, string> = {
  blocked:
    "The website blocked automatic access to that page. Tell the user this site doesn't allow recipes to be imported from a link, suggest they paste the recipe text into the chat instead, and do not fabricate a recipe.",
  "fetch-failed":
    "Could not load that page. Tell the user the link couldn't be opened (it may be broken or the site may be down), suggest they check it or paste the recipe text instead, and do not fabricate a recipe.",
  "no-recipe":
    "The page loaded but has no recipe data that can be read. Tell the user no recipe could be read from that link, suggest they paste the recipe text into the chat instead, and do not fabricate a recipe.",
};

// The model may echo a URL slightly differently from how the user typed it
// (trailing slash, fragment), so match prefetched pages loosely.
const normalizeUrl = (url: string) => url.trim().replace(/#.*$/, "").replace(/\/+$/, "");

// prefetchedPages are the pages the app fetched on the user's device for links
// in the latest message (see importRecipe.ts for why).
export const makeImportRecipeFromUrlTool = (prefetchedPages: PrefetchedPage[] = []) =>
  tool(
    async ({ url }: { url: string }) => {
      const prefetched = prefetchedPages.find(
        (page) => normalizeUrl(page.url) === normalizeUrl(url),
      );

      const result = await importRecipe(url, prefetched);
      if (!result.ok) {
        return IMPORT_FAILURE_MESSAGES[result.reason];
      }

      // Only the fields present here came from the source; anything absent (e.g.
      // nutrition, servings) the agent should estimate, per the system prompt.
      return JSON.stringify(result.recipe);
    },
    {
      name: "importRecipeFromUrl",
      description:
        "Read a recipe from a web link (URL) the user shares. Returns the recipe's fields as JSON (title, ingredients, instructions, and servings/nutrition when the page provides them), or a message saying why the recipe couldn't be read.",
      schema: z.object({
        url: z.string().describe("The recipe page URL the user shared."),
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
