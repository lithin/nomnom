import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";
import type { useTheme } from "@tamagui/core";

import { tokens } from "../theme/config";

type Theme = ReturnType<typeof useTheme>;

// Shared so RecipeDetails looks identical whether it's pushed from the Recipes
// stack or from the Chat stack (via a recipe:// link in a message).
export const getRecipeDetailsScreenOptions = (theme: Theme): NativeStackNavigationOptions => ({
  title: "Recipe Details",
  headerStyle: { backgroundColor: theme.backgroundSecondary.val as string },
  headerTintColor: tokens.color.darkOlive.val as string,
  headerTitleStyle: { color: theme.titleText.val as string },
});
