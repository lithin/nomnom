import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { importRecipe } from "../src/endpoints/recipes/importRecipe";

const URL = "https://example.com/pancakes";

const recipeJsonLd = JSON.stringify({
  "@type": "Recipe",
  name: "Lemon Pancakes",
  recipeIngredient: ["1 cup flour"],
  recipeInstructions: ["Mix and fry."],
});

const htmlResponse = (body: string, status = 200) =>
  new Response(body, { status, headers: { "content-type": "text/html" } });

describe("importRecipe", () => {
  // Stand in for the recipe site: setup.ts's network guard would otherwise
  // reject the server-side fetch. Each test scripts what the "site" returns.
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  describe("with a page fetched on the device", () => {
    it("parses the device's JSON-LD without fetching on the server", async () => {
      const result = await importRecipe(URL, { url: URL, status: 200, jsonLd: [recipeJsonLd] });

      expect(result.ok && result.recipe.title).toBe("Lemon Pancakes");
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports no-recipe when the device's page has no Recipe JSON-LD", async () => {
      const result = await importRecipe(URL, { url: URL, status: 200, jsonLd: [] });

      expect(result).toEqual({ ok: false, reason: "no-recipe" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports blocked when the site rejected the device", async () => {
      const result = await importRecipe(URL, { url: URL, status: 403, jsonLd: [] });

      expect(result).toEqual({ ok: false, reason: "blocked" });
      expect(fetchMock).not.toHaveBeenCalled();
    });

    it("reports fetch-failed for other HTTP errors on the device", async () => {
      const result = await importRecipe(URL, { url: URL, status: 404, jsonLd: [] });
      expect(result).toEqual({ ok: false, reason: "fetch-failed" });
    });

    it("falls back to the server when the device got no response", async () => {
      fetchMock.mockResolvedValue(
        htmlResponse(`<script type="application/ld+json">${recipeJsonLd}</script>`),
      );

      const result = await importRecipe(URL, { url: URL, status: 0, jsonLd: [] });

      expect(result.ok).toBe(true);
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("fetching on the server", () => {
    it("parses the fetched page", async () => {
      fetchMock.mockResolvedValue(
        htmlResponse(`<script type=application/ld+json>${recipeJsonLd}</script>`),
      );

      const result = await importRecipe(URL);

      expect(result.ok && result.recipe.title).toBe("Lemon Pancakes");
    });

    it("reports blocked on a 403 and logs why", async () => {
      fetchMock.mockResolvedValue(htmlResponse("Access denied", 403));

      expect(await importRecipe(URL)).toEqual({ ok: false, reason: "blocked" });
      expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("blocked"));
    });

    it("reports fetch-failed when the request throws", async () => {
      fetchMock.mockRejectedValue(new TypeError("fetch failed"));
      expect(await importRecipe(URL)).toEqual({ ok: false, reason: "fetch-failed" });
    });

    it("reports no-recipe when the page has no recipe data", async () => {
      fetchMock.mockResolvedValue(htmlResponse("<html><body>Just a blog post</body></html>"));
      expect(await importRecipe(URL)).toEqual({ ok: false, reason: "no-recipe" });
    });
  });
});
