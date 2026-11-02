import { beforeEach, describe, expect, it, vi } from "vitest";

// The tool reaches the network via importRecipe; mock it at the module
// boundary so the tool logic runs without any outbound request (see setup.ts).
// vi.hoisted keeps the mock fn available to the hoisted vi.mock factory.
const { importRecipe } = vi.hoisted(() => ({ importRecipe: vi.fn() }));
vi.mock("../src/endpoints/recipes/importRecipe", () => ({ importRecipe }));

import { makeImportRecipeFromUrlTool } from "../src/endpoints/recipes/agentTools";
import type { PrefetchedPage } from "../src/endpoints/recipes/importRecipe";

const invoke = async (url: string, prefetchedPages?: PrefetchedPage[]): Promise<string> => {
  const result = await makeImportRecipeFromUrlTool(prefetchedPages).invoke({ url });
  return typeof result === "string" ? result : (result as { content: string }).content;
};

describe("importRecipeFromUrl tool", () => {
  beforeEach(() => {
    importRecipe.mockReset();
  });

  it("returns the parsed recipe as JSON when import succeeds", async () => {
    const recipe = {
      title: "Lemon Pancakes",
      servings: "4 servings",
      ingredients: ["1 cup flour"],
      instructions: ["Mix and fry."],
    };
    importRecipe.mockResolvedValue({ ok: true, recipe });

    const message = await invoke("https://example.com/pancakes");

    expect(importRecipe).toHaveBeenCalledWith("https://example.com/pancakes", undefined);
    expect(JSON.parse(message)).toEqual(recipe);
  });

  it("passes the device-fetched page for the URL, matching trailing slashes loosely", async () => {
    importRecipe.mockResolvedValue({ ok: false, reason: "no-recipe" });
    const page = { url: "https://example.com/pancakes/", status: 200, jsonLd: ["{}"] };
    const other = { url: "https://example.com/other", status: 200, jsonLd: [] };

    await invoke("https://example.com/pancakes", [other, page]);

    expect(importRecipe).toHaveBeenCalledWith("https://example.com/pancakes", page);
  });

  it("tells the agent the site blocked access", async () => {
    importRecipe.mockResolvedValue({ ok: false, reason: "blocked" });
    expect(await invoke("https://example.com/x")).toContain("blocked");
  });

  it("tells the agent the page could not be loaded", async () => {
    importRecipe.mockResolvedValue({ ok: false, reason: "fetch-failed" });
    expect(await invoke("https://example.com/x")).toContain("Could not load that page");
  });

  it("tells the agent the page has no recipe data", async () => {
    importRecipe.mockResolvedValue({ ok: false, reason: "no-recipe" });
    expect(await invoke("https://example.com/x")).toContain("no recipe data");
  });
});
