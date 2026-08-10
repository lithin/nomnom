// The saveRecipe tool hands the model a ready-made [Title](recipe://id) link
// (see recipes/agentTools.ts) and the prompt asks it to echo that link in its
// confirmation so the user can open what they just saved. Gemini frequently
// ignores that and replies with plain text, dropping the link entirely. Rather
// than trust the model, we pull the link straight from the tool's result message
// and let the endpoint guarantee it reaches the reply.

const RECIPE_LINK = /\[[^\]]*\]\(recipe:\/\/([^)]+)\)/;

// The ToolMessage produced by saveRecipe is the only message in the turn whose
// top-level name is "saveRecipe" (the AIMessage that requests the call carries
// the name inside tool_calls, not at the top level), so this uniquely picks out
// the save result without depending on langchain's message-type internals.
const isSaveRecipeToolResult = (message: unknown): boolean =>
  !!message && typeof message === "object" && (message as { name?: unknown }).name === "saveRecipe";

const messageContentText = (content: unknown): string | null => {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    const text = content
      .map((item) =>
        item && typeof item === "object" && typeof (item as { text?: unknown }).text === "string"
          ? (item as { text: string }).text
          : "",
      )
      .join("");
    return text.length > 0 ? text : null;
  }

  return null;
};

export type SavedRecipeLink = { link: string; id: string };

// The [Title](recipe://id) link produced by the saveRecipe tool during this
// turn, or null if nothing was saved. Scans from the end so the most recent save
// wins on the off chance a turn saved more than once.
export const findSavedRecipeLink = (messages: unknown[]): SavedRecipeLink | null => {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const message = messages[i];
    if (!isSaveRecipeToolResult(message)) {
      continue;
    }

    const match = messageContentText((message as { content?: unknown }).content)?.match(
      RECIPE_LINK,
    );
    if (match) {
      return { link: match[0], id: match[1] };
    }
  }

  return null;
};

// Guarantee the saved-recipe link is present in the reply. When a recipe was
// saved but the model left the link out, append it so the user can always open
// what they just saved. If the reply already references the same recipe id (in
// any form), leave it untouched to avoid a duplicate link.
export const ensureSavedRecipeLink = (reply: string, saved: SavedRecipeLink | null): string => {
  if (!saved || reply.includes(`recipe://${saved.id}`)) {
    return reply;
  }

  return `${reply}\n\n${saved.link}`;
};
