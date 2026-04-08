import { useNavigation } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View } from "react-native";
import { fetchRecipes } from "./api";
import { RecipeItem } from "./components/RecipeItem";
import type { Recipe } from "./types";

export function RecipesScreen() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(false);
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const navigation = useNavigation<any>();

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchRecipes();
      setRecipes(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      loadRecipes();
    });
    loadRecipes();
    return unsubscribe;
  }, [navigation, loadRecipes]);

  const handlePress = useCallback(
    (recipe: Recipe) => {
      navigation.navigate("RecipeDetails", { recipe });
    },
    [navigation],
  );

  const renderItem = useCallback(
    ({ item }: { item: Recipe }) => <RecipeItem item={item} onPress={handlePress} />,
    [handlePress],
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007aff" />
        </View>
      ) : recipes.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No saved recipes yet.</Text>
        </View>
      ) : (
        <FlatList
          data={recipes}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    padding: 16,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
  },
});
