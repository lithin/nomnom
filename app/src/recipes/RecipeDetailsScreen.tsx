import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { deleteRecipe } from "./api";
import type { Recipe } from "./types";

export function RecipeDetailsScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const route = useRoute<any>();
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const navigation = useNavigation<any>();
  const recipe: Recipe = (route.params as { recipe: Recipe })?.recipe;

  if (!recipe) return null;

  const handleEdit = () => {
    if (!recipe.chatSessionId) {
      Alert.alert(
        "Cannot Edit In Chat",
        "This recipe is not linked to a chat yet, so chat-based editing is unavailable.",
      );
      return;
    }

    const now = new Date().toISOString();

    navigation.getParent()?.navigate("Chat", {
      chatId: recipe.chatSessionId,
      initialMessages: [
        {
          id: `edit-init-1`,
          role: "user",
          text: `I want to update the recipe "${recipe.title}". Let's start with what we have. Please provide the current recipe and I will tell you what to change.`,
          createdAt: now,
        },
        {
          id: `edit-init-2`,
          role: "assistant",
          text: `Sure. Here is the current recipe for "${recipe.title}":\n\n${recipe.content}\n\nWhat would you like me to update?`,
          createdAt: now,
        },
      ],
    });
  };

  const handleDelete = () => {
    Alert.alert("Delete Recipe", "Are you sure you want to delete this recipe?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteRecipe(recipe.id);
            navigation.goBack();
          } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to delete recipe");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity onPress={handleEdit} style={styles.iconButton}>
            <Ionicons name="create-outline" size={24} color="#007aff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleDelete} style={styles.iconButton}>
            <Ionicons name="trash-outline" size={24} color="#ff3b30" />
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.date}>{new Date(recipe.createdAt).toLocaleDateString()}</Text>
      <View style={styles.markdownContainer}>
        <Markdown>{recipe.content}</Markdown>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#333",
    flex: 1,
    marginRight: 16,
  },
  actionButtons: {
    flexDirection: "row",
  },
  date: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  iconButton: {
    padding: 4,
    marginLeft: 16,
  },
  markdownContainer: {
    marginTop: 8,
  },
});
