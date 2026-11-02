import { describe, expect, it } from "vitest";

import { parseRecipeFromHtml } from "../src/endpoints/recipes/recipeJsonLd";

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

describe("parseRecipeFromHtml", () => {
  it("extracts all fields from a complete Recipe JSON-LD", () => {
    const recipe = parseRecipeFromHtml(pageWith(fullRecipe));

    expect(recipe).not.toBeNull();
    expect(recipe).toEqual({
      title: "Lemon Pancakes",
      servings: "4 servings",
      ingredients: ["1 cup flour", "1 lemon", "2 eggs"],
      instructions: ["Mix everything.", "Fry until golden."],
      nutrition: { Calories: "220 kcal", Protein: "8 g" },
    });
  });

  it("finds the Recipe node inside an @graph document", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({
        "@context": "https://schema.org",
        "@graph": [{ "@type": "WebPage" }, fullRecipe],
      }),
    );

    expect(recipe).not.toBeNull();
    expect(recipe?.title).toBe("Lemon Pancakes");
  });

  it("matches a Recipe when @type is an array", () => {
    const recipe = parseRecipeFromHtml(pageWith({ ...fullRecipe, "@type": ["Recipe", "Thing"] }));
    expect(recipe).not.toBeNull();
  });

  it("handles instructions given as a single string", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({ ...fullRecipe, recipeInstructions: "Mix and fry." }),
    );
    expect(recipe).not.toBeNull();
    expect(recipe?.instructions).toEqual(["Mix and fry."]);
  });

  it("flattens HowToSection instructions into their steps", () => {
    const recipe = parseRecipeFromHtml(
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
    expect(recipe).not.toBeNull();
    expect(recipe?.instructions).toEqual(["Whisk flour and eggs.", "Add lemon."]);
  });

  it("strips inline HTML and decodes entities in text fields", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({
        ...fullRecipe,
        recipeIngredient: ["<b>1 cup</b> flour &amp; sugar"],
        recipeInstructions: ["Mix &#39;til smooth"],
      }),
    );
    expect(recipe).not.toBeNull();
    expect(recipe?.ingredients).toEqual(["1 cup flour & sugar"]);
    expect(recipe?.instructions).toEqual(["Mix 'til smooth"]);
  });

  it("omits servings and nutrition when the source lacks them", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({
        "@type": "Recipe",
        name: "Bare Recipe",
        recipeIngredient: ["1 egg"],
        recipeInstructions: ["Fry it."],
      }),
    );
    expect(recipe).not.toBeNull();
    expect(recipe).toEqual({
      title: "Bare Recipe",
      ingredients: ["1 egg"],
      instructions: ["Fry it."],
    });
    expect(recipe).not.toHaveProperty("servings");
    expect(recipe).not.toHaveProperty("nutrition");
  });

  it("returns null when instructions are missing, even with other fields", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({
        "@type": "Recipe",
        name: "No Steps",
        recipeIngredient: ["1 egg"],
        recipeYield: "2",
        nutrition: { "@type": "NutritionInformation", calories: "90 kcal" },
      }),
    );
    expect(recipe).toBeNull();
  });

  it("returns null when ingredients are missing", () => {
    const recipe = parseRecipeFromHtml(
      pageWith({ "@type": "Recipe", name: "No Ingredients", recipeInstructions: ["Cook it."] }),
    );
    expect(recipe).toBeNull();
  });

  it("returns null when the page has no Recipe JSON-LD", () => {
    const recipe = parseRecipeFromHtml(pageWith({ "@type": "WebPage", name: "Some Article" }));
    expect(recipe).toBeNull();
  });

  it("returns null when there is no JSON-LD at all", () => {
    const recipe = parseRecipeFromHtml("<html><body>No structured data here.</body></html>");
    expect(recipe).toBeNull();
  });

  it("ignores malformed JSON-LD blocks and reads a valid one", () => {
    const html =
      `<script type="application/ld+json">{ not valid json </script>` +
      `<script type="application/ld+json">${JSON.stringify(fullRecipe)}</script>`;
    const recipe = parseRecipeFromHtml(html);
    expect(recipe).not.toBeNull();
  });

  it("reads ld+json blocks whose type attribute is unquoted (minified pages)", () => {
    const html =
      `<html><head><script type=application/ld+json class=yoast-schema-graph>` +
      `${JSON.stringify({ "@context": "https://schema.org", "@graph": [fullRecipe] })}` +
      `</script></head></html>`;
    expect(parseRecipeFromHtml(html)?.title).toBe("Lemon Pancakes");
  });
});
