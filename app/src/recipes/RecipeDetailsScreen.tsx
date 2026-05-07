import Ionicons from "@expo/vector-icons/Ionicons";
import { PlatformPressable } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";
import { deleteRecipe, ensureRecipeChatSession } from "./api";
import type { Recipe } from "./types";

export function RecipeDetailsScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const route = useRoute<any>();
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const navigation = useNavigation<any>();
  const recipe: Recipe = (route.params as { recipe: Recipe })?.recipe;
  const [chatSessionId, setChatSessionId] = useState<string | null>(recipe?.chatSessionId ?? null);
  const [isPreparingEditChat, setPreparingEditChat] = useState(false);

  useEffect(() => {
    setChatSessionId(recipe?.chatSessionId ?? null);
  }, [recipe?.chatSessionId]);

  const handleEdit = useCallback(() => {
    if (!recipe || isPreparingEditChat) {
      return;
    }

    const openEditChat = async () => {
      try {
        setPreparingEditChat(true);

        const resolvedChatSessionId = chatSessionId ?? (await ensureRecipeChatSession(recipe.id));

        setChatSessionId(resolvedChatSessionId);

        navigation.getParent()?.navigate("Chat", {
          screen: "ChatMain",
          params: {
            chatId: resolvedChatSessionId,
          },
        });
      } catch (error) {
        console.error("Failed to prepare recipe edit chat", error);
        Alert.alert(
          "Unable To Start Editing",
          "We couldn't prepare a chat for this recipe. Please try again.",
        );
      } finally {
        setPreparingEditChat(false);
      }
    };

    void openEditChat();
  }, [navigation, recipe, chatSessionId, isPreparingEditChat]);

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
          <PlatformPressable onPress={handleEdit} style={styles.headerIconButton}>
            <Ionicons name="create-outline" size={22} color="#007aff" />
          </PlatformPressable>
          <PlatformPressable onPress={handleDelete} style={styles.headerIconButton}>
            <Ionicons name="trash-outline" size={22} color="#ff3b30" />
          </PlatformPressable>
        </View>
      ),
    });
  }, [navigation, handleDelete, handleEdit, recipe]);

  if (!recipe) return null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>{recipe.title}</Text>
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
    marginRight: 8,
  },
  date: {
    fontSize: 14,
    color: "#888",
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
});
