import { describe, expect, it } from "vitest";
import { ensureSavedRecipeLink, findSavedRecipeLink } from "../src/endpoints/chat/savedRecipeLink";

// The exact confirmation string the saveRecipe tool returns (see agentTools.ts).
const savedToolResult = (title: string, id: string) =>
  `Recipe successfully saved. Include this link in your reply so the user can open it: [${title}](recipe://${id})`;

describe("findSavedRecipeLink", () => {
  it("pulls the link out of the saveRecipe tool result", () => {
    const messages = [
      { content: "save it" },
      { name: "saveRecipe", content: savedToolResult("Carbonara", "abc-123") },
      { content: "All done!" },
    ];

    expect(findSavedRecipeLink(messages)).toEqual({
      link: "[Carbonara](recipe://abc-123)",
      id: "abc-123",
    });
  });

  it("returns null when no recipe was saved in the turn", () => {
    const messages = [
      { content: "any ideas?" },
      { name: "findSavedRecipes", content: '[{"id":"x","title":"Tacos"}]' },
      { content: "Here are some ideas" },
    ];

    expect(findSavedRecipeLink(messages)).toBeNull();
  });
});

describe("ensureSavedRecipeLink", () => {
  const saved = { link: "[Carbonara](recipe://abc-123)", id: "abc-123" };

  it("appends the link when the reply left it out", () => {
    expect(ensureSavedRecipeLink("Saved!", saved)).toBe("Saved!\n\n[Carbonara](recipe://abc-123)");
  });

  it("leaves the reply untouched when it already references the recipe id", () => {
    const reply = "Saved it here: [Carbonara](recipe://abc-123)";
    expect(ensureSavedRecipeLink(reply, saved)).toBe(reply);
  });

  it("is a no-op when nothing was saved", () => {
    expect(ensureSavedRecipeLink("Here are some ideas", null)).toBe("Here are some ideas");
  });
});
