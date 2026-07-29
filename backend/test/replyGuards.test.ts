import { describe, expect, it } from "vitest";

import { isRetriableReply, looksLikeUnexecutedToolCall } from "../src/endpoints/chat/replyGuards";

describe("looksLikeUnexecutedToolCall", () => {
  it("flags a Gemini tool_code block printed as text", () => {
    const reply = [
      "Here is the recipe...",
      "```tool_code",
      'print(default_api.saveRecipe(title="Scrambled Eggs", recipe="..."))',
      "```",
      "The recipe has been saved!",
    ].join("\n");

    expect(looksLikeUnexecutedToolCall(reply)).toBe(true);
  });

  it("flags a bare default_api call narrated inline", () => {
    expect(looksLikeUnexecutedToolCall("I'll call default_api.saveRecipe now.")).toBe(true);
  });

  it("does not flag a normal saved confirmation with a recipe link", () => {
    const reply = "Great! Your recipe [Scrambled Eggs](recipe://abc-123) has been saved.";
    expect(looksLikeUnexecutedToolCall(reply)).toBe(false);
  });

  it("does not flag ordinary recipe prose that mentions tools/printing", () => {
    const reply = "Print the recipe and use your favourite tools to whisk the eggs.";
    expect(looksLikeUnexecutedToolCall(reply)).toBe(false);
  });
});

describe("isRetriableReply", () => {
  it("retries an empty completion (null or blank)", () => {
    expect(isRetriableReply(null)).toBe(true);
    expect(isRetriableReply("")).toBe(true);
  });

  it("retries a narrated-but-unexecuted tool call", () => {
    expect(isRetriableReply("```tool_code\nprint(default_api.saveRecipe())\n```")).toBe(true);
  });

  it("does not retry a normal reply", () => {
    expect(isRetriableReply("Saved! [Eggs](recipe://abc-123)")).toBe(false);
  });
});
