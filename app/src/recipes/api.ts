import { getBackendUrl } from "../chat/api";
import type { Recipe } from "./types";

export const fetchRecipes = async (): Promise<Recipe[]> => {
  const response = await fetch(`${getBackendUrl()}/recipes`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recipes");
  }

  const data = await response.json();
  return data.recipes || [];
};

export const deleteRecipe = async (id: string): Promise<void> => {
  const response = await fetch(`${getBackendUrl()}/recipes/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to delete recipe");
  }
};
