import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
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
    expect(console.warn).toHaveBeenCalledWith(
      "Recipe import found no usable Recipe JSON-LD at https://example.com/not-a-recipe",
    );
  });

  it("returns the unparseable message and logs why when the fetch throws", async () => {
    extractRecipeFromUrl.mockRejectedValue(new Error("Fetch failed with status 403"));

    const message = await invoke("https://example.com/boom");

    expect(message).toContain("can't be parsed");
    expect(console.warn).toHaveBeenCalledWith(
      "Recipe import failed to fetch https://example.com/boom: Fetch failed with status 403",
    );
  });
});
