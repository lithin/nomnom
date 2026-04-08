import { memo } from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import type { Recipe } from "../types";

export const RecipeItem = memo(
  ({ item, onPress }: { item: Recipe; onPress: (recipe: Recipe) => void }) => (
    <TouchableOpacity style={styles.recipeCard} onPress={() => onPress(item)}>
      <Text style={styles.recipeTitle}>{item.title}</Text>
    </TouchableOpacity>
  ),
);

const styles = StyleSheet.create({
  recipeCard: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recipeTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
});
