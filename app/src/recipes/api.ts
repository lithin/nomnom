import { fetchWithLogging, getBackendHeaders, getBackendUrl } from "../backend/apiConfig";
import type { Recipe } from "./types";

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const url = `${getBackendUrl()}/recipes`;
  const response = await fetchWithLogging(url, {
    method: "GET",
    headers: getBackendHeaders(),
  });

  if (!response.ok) {
    console.error("Failed to fetch recipes:", await response.text());
    throw new Error("Failed to fetch recipes");
  }

  const data = await response.json();
  return data.recipes || [];
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const response = await fetchWithLogging(`${getBackendUrl()}/recipes/${id}`, {
    method: "DELETE",
    headers: getBackendHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to delete recipe");
  }
};

export const ensureRecipeChatSession = async (recipeId: string): Promise<string> => {
  const response = await fetchWithLogging(`${getBackendUrl()}/recipes/${recipeId}/chat-session`, {
    method: "POST",
    headers: getBackendHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to create recipe chat session");
  }

  const data = (await response.json()) as { chatSessionId?: string };
  const chatSessionId = data.chatSessionId?.trim();

  if (!chatSessionId) {
    throw new Error("Backend did not return chatSessionId");
  }

  return chatSessionId;
};
