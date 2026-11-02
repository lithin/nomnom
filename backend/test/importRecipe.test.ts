import { describe, expect, it } from "vitest";

import { extractRecipeFromHtml } from "../src/endpoints/recipes/importRecipe";

// Wrap a JSON-LD object in the script tag a real page would carry.
const pageWith = (jsonLd: unknown): string =>
  `<!doctype html><html><head>` +
  `<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>` +
  `</head><body>...</body></html>`;

const fullRecipe = {
  "@context": "https://schema.org",
  "@type": "Recipe",
  name: "Lemon Pancakes",
  recipeYield: "4 servings",
  recipeIngredient: ["1 cup flour", "1 lemon", "2 eggs"],
  recipeInstructions: [
    { "@type": "HowToStep", text: "Mix everything." },
    { "@type": "HowToStep", text: "Fry until golden." },
  ],
  nutrition: {
    "@type": "NutritionInformation",
    calories: "220 kcal",
    proteinContent: "8 g",
  },
};

describe("extractRecipeFromHtml", () => {
  it("extracts all fields from a complete Recipe JSON-LD", () => {
    const result = extractRecipeFromHtml(pageWith(fullRecipe));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe).toEqual({
      title: "Lemon Pancakes",
      servings: "4 servings",
      ingredients: ["1 cup flour", "1 lemon", "2 eggs"],
      instructions: ["Mix everything.", "Fry until golden."],
      nutrition: { Calories: "220 kcal", Protein: "8 g" },
    });
  });

  it("finds the Recipe node inside an @graph document", () => {
    const result = extractRecipeFromHtml(
      pageWith({
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage" }, fullRecipe],
      }),
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.title).toBe("Lemon Pancakes");
  });

  it("matches a Recipe when @type is an array", () => {
    const result = extractRecipeFromHtml(pageWith({ ...fullRecipe, "@type": ["Recipe", "Thing"] }));
    expect(result.ok).toBe(true);
  });

  it("handles instructions given as a single string", () => {
    const result = extractRecipeFromHtml(
      pageWith({ ...fullRecipe, recipeInstructions: "Mix and fry." }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.instructions).toEqual(["Mix and fry."]);
  });

  it("flattens HowToSection instructions into their steps", () => {
    const result = extractRecipeFromHtml(
      pageWith({
        ...fullRecipe,
        recipeInstructions: [
          {
            "@type": "HowToSection",
            name: "Batter",
            itemListElement: [
              { "@type": "HowToStep", text: "Whisk flour and eggs." },
              { "@type": "HowToStep", text: "Add lemon." },
            ],
          },
        ],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.instructions).toEqual(["Whisk flour and eggs.", "Add lemon."]);
  });

  it("strips inline HTML and decodes entities in text fields", () => {
    const result = extractRecipeFromHtml(
      pageWith({
        ...fullRecipe,
        recipeIngredient: ["<b>1 cup</b> flour &amp; sugar"],
        recipeInstructions: ["Mix &#39;til smooth"],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe.ingredients).toEqual(["1 cup flour & sugar"]);
    expect(result.recipe.instructions).toEqual(["Mix 'til smooth"]);
  });

  it("omits servings and nutrition when the source lacks them", () => {
    const result = extractRecipeFromHtml(
      pageWith({
        "@type": "Recipe",
        name: "Bare Recipe",
        recipeIngredient: ["1 egg"],
        recipeInstructions: ["Fry it."],
      }),
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.recipe).toEqual({
      title: "Bare Recipe",
      ingredients: ["1 egg"],
      instructions: ["Fry it."],
    });
    expect(result.recipe).not.toHaveProperty("servings");
    expect(result.recipe).not.toHaveProperty("nutrition");
  });

  it("reports unparseable when instructions are missing, even with other fields", () => {
    const result = extractRecipeFromHtml(
      pageWith({
        "@type": "Recipe",
        name: "No Steps",
        recipeIngredient: ["1 egg"],
        recipeYield: "2",
        nutrition: { "@type": "NutritionInformation", calories: "90 kcal" },
      }),
    );
    expect(result).toEqual({ ok: false, reason: "unparseable" });
  });

  it("reports unparseable when ingredients are missing", () => {
    const result = extractRecipeFromHtml(
      pageWith({ "@type": "Recipe", name: "No Ingredients", recipeInstructions: ["Cook it."] }),
    );
    expect(result).toEqual({ ok: false, reason: "unparseable" });
  });

  it("reports unparseable when the page has no Recipe JSON-LD", () => {
    const result = extractRecipeFromHtml(pageWith({ "@type": "WebPage", name: "Some Article" }));
    expect(result).toEqual({ ok: false, reason: "unparseable" });
  });

  it("reports unparseable when there is no JSON-LD at all", () => {
    const result = extractRecipeFromHtml("<html><body>No structured data here.</body></html>");
    expect(result).toEqual({ ok: false, reason: "unparseable" });
  });

  it("ignores malformed JSON-LD blocks and reads a valid one", () => {
    const html =
      `<script type="application/ld+json">{ not valid json </script>` +
      `<script type="application/ld+json">${JSON.stringify(fullRecipe)}</script>`;
    const result = extractRecipeFromHtml(html);
    expect(result.ok).toBe(true);
  });
});
