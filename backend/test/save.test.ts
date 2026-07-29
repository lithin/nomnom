import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/shared/db", () => import("./testDb"));

// createRecipe embeds the recipe and kicks off tag/image metadata, both of
// which call Gemini. Stub them at the module boundary so the save path runs
// against the in-memory DB without any network (see test/setup.ts guard).
vi.mock("../src/shared/embeddings", () => ({
  embedText: async () => "[0,0,0]",
  EMBEDDING_MODEL: "test-embedding",
  EMBEDDING_DIMENSIONS: 3,
}));
vi.mock("../src/endpoints/recipes/generateMetadata", () => ({
  generateRecipeMetadata: () => {},
  generateAndSaveTags: async () => {},
}));

import { makeSaveRecipeTool } from "../src/endpoints/recipes/agentTools";
import { resetTestDb, testDb } from "./testDb";

const invokeTool = async (
  tool: ReturnType<typeof makeSaveRecipeTool>,
  args: { recipe: string; title: string },
): Promise<string> => {
  const result = await tool.invoke(args);
  // Direct invocation returns the tool's string output; guard in case a
  // langchain version wraps it in a ToolMessage.
  return typeof result === "string" ? result : (result as { content: string }).content;
};

describe("saveRecipe tool", () => {
  beforeEach(() => {
    resetTestDb();
  });

  it("persists the recipe and returns a confirmation linking to exactly that recipe", async () => {
    const session = await testDb.chatSession.create({ data: { title: "Carbonara" } });

    const message = await invokeTool(makeSaveRecipeTool(session.id), {
      recipe: "Eggs, guanciale, pecorino, black pepper.",
      title: "Carbonara",
    });

    const recipes = await testDb.recipe.findMany();
    expect(recipes).toHaveLength(1);

    const saved = recipes[0];
    expect(saved.title).toBe("Carbonara");
    expect(saved.content).toBe("Eggs, guanciale, pecorino, black pepper.");
    expect(saved.chatSessionId).toBe(session.id);

    // The "saved" message must carry a recipe:// link pointing at the recipe
    // that was just created - the app turns this into a tap-to-open link.
    expect(message).toContain(`[Carbonara](recipe://${saved.id})`);
  });
});
