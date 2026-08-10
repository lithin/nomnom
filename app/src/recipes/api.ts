import { fetchWithLogging, getBackendHeaders, getBackendUrl } from "../backend/apiConfig";
import type { Recipe, RecipeImageOption } from "./types";

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

export const fetchRecipe = async (id: string): Promise<Recipe> => {
  const response = await fetchWithLogging(`${getBackendUrl()}/recipes/${id}`, {
    method: "GET",
    headers: getBackendHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch recipe");
  }

  return (await response.json()) as Recipe;
};

export const fetchImageOptions = async (id: string): Promise<RecipeImageOption[]> => {
  const response = await fetchWithLogging(`${getBackendUrl()}/recipes/${id}/image-options`, {
    method: "GET",
    headers: getBackendHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to fetch image options");
  }

  const data = await response.json();
  return data.options || [];
};

export const updateRecipeImage = async (id: string, imageUrl: string): Promise<Recipe> => {
  const response = await fetchWithLogging(`${getBackendUrl()}/recipes/${id}`, {
    method: "PATCH",
    headers: getBackendHeaders(),
    body: JSON.stringify({ imageUrl }),
  });

  if (!response.ok) {
    throw new Error("Failed to update recipe image");
  }

  return (await response.json()) as Recipe;
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
