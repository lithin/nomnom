export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ChatRequestBody = {
  messages?: ChatMessage[];
  chatId?: string;
  // Recipe pages the app fetched on the device for links in the latest
  // message (see recipes/importRecipe.ts). Unvalidated until parsed.
  prefetchedPages?: unknown;
};

export type ChatRole = "user" | "assistant";

export type PersistedChatMessage = {
  id: string;
  chatId: string;
  role: ChatRole;
  text: string;
  createdAt: Date;
};
