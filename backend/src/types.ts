export type ChatMessage = {
  role: "user" | "assistant";
  text: string;
};

export type ChatRequestBody = {
  messages?: ChatMessage[];
  editingRecipeId?: string;
};
