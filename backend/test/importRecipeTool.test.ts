import { beforeEach, describe, expect, it, vi } from "vitest";

// The tool reaches the network via extractRecipeFromUrl; mock it at the module
// boundary so the tool logic runs without any outbound request (see setup.ts).
// vi.hoisted keeps the mock fn available to the hoisted vi.mock factory.
const { extractRecipeFromUrl } = vi.hoisted(() => ({ extractRecipeFromUrl: vi.fn() }));
vi.mock("../src/endpoints/recipes/importRecipe", () => ({ extractRecipeFromUrl }));

import { importRecipeFromUrlTool } from "../src/endpoints/recipes/agentTools";

const invoke = async (url: string): Promise<string> => {
  const result = await importRecipeFromUrlTool.invoke({ url });
  return typeof result === "string" ? result : (result as { content: string }).content;
};

describe("importRecipeFromUrl tool", () => {
  beforeEach(() => {
    extractRecipeFromUrl.mockReset();
  });

  it("returns the parsed recipe as JSON when extraction succeeds", async () => {
    const recipe = {
      title: "Lemon Pancakes",
      servings: "4 servings",
      ingredients: ["1 cup flour"],
      instructions: ["Mix and fry."],
    };
    extractRecipeFromUrl.mockResolvedValue({ ok: true, recipe });

    const message = await invoke("https://example.com/pancakes");

    expect(extractRecipeFromUrl).toHaveBeenCalledWith("https://example.com/pancakes");
    expect(JSON.parse(message)).toEqual(recipe);
  });

  it("returns the unparseable message when extraction finds no recipe", async () => {
    extractRecipeFromUrl.mockResolvedValue({ ok: false, reason: "unparseable" });

    const message = await invoke("https://example.com/not-a-recipe");

    expect(message).toContain("can't be parsed");
  });

  it("returns the unparseable message when the fetch throws", async () => {
    extractRecipeFromUrl.mockRejectedValue(new Error("network down"));

    const message = await invoke("https://example.com/boom");

    expect(message).toContain("can't be parsed");
  });
});
