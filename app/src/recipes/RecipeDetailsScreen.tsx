import Ionicons from "@expo/vector-icons/Ionicons";
import { PlatformPressable } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useLayoutEffect } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { useTheme } from "tamagui/native";

import { tokens } from "../theme/config";
import { deleteRecipe } from "./api";
import type { Recipe } from "./types";

export function RecipeDetailsScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const route = useRoute<any>();
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const recipe: Recipe = (route.params as { recipe: Recipe })?.recipe;

  const handleEdit = useCallback(() => {
    if (!recipe) {
      return;
    }

    // The backend guarantees a chatSessionId on retrieval, creating the chat
    // session if the recipe doesn't have one yet.
    if (!recipe.chatSessionId) {
      Alert.alert(
        "Unable To Start Editing",
        "This recipe has no chat yet. Please go back to the recipe list and try again.",
      );
      return;
    }

    navigation.getParent()?.navigate("Chat", {
      screen: "ChatMain",
      params: {
        chatId: recipe.chatSessionId,
      },
    });
  }, [navigation, recipe]);

  const handleChangeImage = useCallback(() => {
    if (!recipe) {
      return;
    }

    navigation.navigate("ImagePicker", { recipeId: recipe.id });
  }, [navigation, recipe]);

  const handleDelete = useCallback(() => {
    if (!recipe) {
      return;
    }

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
  }, [navigation, recipe]);

  useLayoutEffect(() => {
    if (!recipe) {
      navigation.setOptions({ headerRight: undefined });
      return;
    }

    navigation.setOptions({
      headerRight: () => (
        <View style={styles.headerActions}>
          <PlatformPressable
            onPress={handleChangeImage}
            style={styles.headerIconButton}
            accessibilityRole="button"
            accessibilityLabel="Change recipe image"
          >
            <Ionicons name="image-outline" size={22} color={tokens.color.darkOlive.val as string} />
          </PlatformPressable>
          <PlatformPressable
            onPress={handleEdit}
            style={styles.headerIconButton}
            accessibilityRole="button"
            accessibilityLabel="Edit recipe"
          >
            <Ionicons
              name="create-outline"
              size={22}
              color={tokens.color.darkOlive.val as string}
            />
          </PlatformPressable>
          <PlatformPressable
            onPress={handleDelete}
            style={styles.headerIconButton}
            accessibilityRole="button"
            accessibilityLabel="Delete recipe"
          >
            <Ionicons name="trash-outline" size={22} color={tokens.color.darkOlive.val as string} />
          </PlatformPressable>
        </View>
      ),
    });
  }, [navigation, handleDelete, handleEdit, handleChangeImage, recipe]);

  if (!recipe) return null;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background.val as string }]}
      contentContainerStyle={styles.content}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.titleText.val as string }]}>{recipe.title}</Text>
      </View>
      {recipe.imageUrl ? (
        <Image
          source={{ uri: recipe.imageUrl }}
          style={[styles.image, { backgroundColor: theme.backgroundSecondary.val as string }]}
        />
      ) : null}
      <Text style={[styles.date, { color: theme.colorMuted.val as string }]}>
        {new Date(recipe.createdAt).toLocaleDateString()}
      </Text>
      {recipe.tags && recipe.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {recipe.tags.map((tag) => (
            <View
              key={tag}
              style={[styles.tag, { backgroundColor: theme.backgroundSecondary.val as string }]}
            >
              <Text style={[styles.tagText, { color: theme.color.val as string }]}>{tag}</Text>
            </View>
          ))}
        </View>
      )}
      <View style={styles.markdownContainer}>
        <Markdown>{recipe.content}</Markdown>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    marginRight: 8,
  },
  image: {
    width: "100%",
    height: 220,
    borderRadius: 12,
    marginBottom: 12,
  },
  date: {
    fontSize: 14,
    marginBottom: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  headerIconButton: {
    paddingVertical: 2,
  },
  markdownContainer: {
    marginTop: 8,
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  tag: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 13,
  },
});
