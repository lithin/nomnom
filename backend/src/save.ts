import { type FunctionDeclaration, Type } from "@google/genai";

export const saveRecipeDeclaration: FunctionDeclaration = {
  name: "saveRecipe",
  parametersJsonSchema: {
    type: Type.OBJECT,
    properties: {
      recipe: {
        type: Type.STRING,
        description: "The recipe to save, as presented in the latest relevant message.",
      },
    },
    required: ["recipe"],
  },
};

export const saveRecipe = async ({ recipe }: { recipe: string }) => {
  console.log("Saving recipe:", recipe);
  // Here you would implement the actual saving logic, e.g. save to a database or file.
  // For demonstration, we're just logging it.
};
