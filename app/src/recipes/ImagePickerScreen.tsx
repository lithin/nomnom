import { useNavigation, useRoute } from "@react-navigation/native";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useTheme } from "tamagui/native";

import { tokens } from "../theme/config";
import { fetchImageOptions, updateRecipeImage } from "./api";
import type { RecipeImageOption } from "./types";

interface ImagePickerParams {
  recipeId: string;
}

export function ImagePickerScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const route = useRoute<any>();
  // biome-ignore lint/suspicious/noExplicitAny: needed for navigation typing
  const navigation = useNavigation<any>();
  const theme = useTheme();
  const { recipeId } = (route.params ?? {}) as ImagePickerParams;

  const [options, setOptions] = useState<RecipeImageOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  // The id of the option currently being saved, so we can show a spinner on the
  // tapped tile and block further taps while the PATCH is in flight.
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setFailed(false);
      try {
        const result = await fetchImageOptions(recipeId);
        if (!cancelled) {
          setOptions(result);
        }
      } catch (error) {
        console.error(error);
        if (!cancelled) {
          setFailed(true);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [recipeId]);

  const handleSelect = useCallback(
    async (option: RecipeImageOption) => {
      if (savingId) {
        return;
      }

      setSavingId(option.id);
      try {
        const updated = await updateRecipeImage(recipeId, option.fullUrl);
        // Navigate back to the existing RecipeDetails route with the updated
        // recipe so its image refreshes; the Recipes list refetches on focus.
        navigation.navigate("RecipeDetails", { recipe: updated });
      } catch (error) {
        console.error(error);
        setSavingId(null);
        Alert.alert("Error", "Failed to update the recipe image. Please try again.");
      }
    },
    [navigation, recipeId, savingId],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: RecipeImageOption; index: number }) => (
      <Pressable
        style={styles.tile}
        onPress={() => handleSelect(item)}
        accessibilityRole="button"
        accessibilityLabel={item.alt ?? "Recipe image option"}
        testID={`image-option-${index}`}
        disabled={savingId !== null}
      >
        <Image
          source={{ uri: item.thumbUrl }}
          style={[styles.tileImage, { backgroundColor: theme.backgroundSecondary.val as string }]}
        />
        {savingId === item.id ? (
          <View style={styles.tileOverlay}>
            <View
              style={[styles.tileScrim, { backgroundColor: tokens.color.darkOlive.val as string }]}
            />
            <ActivityIndicator color={tokens.color.white.val as string} />
          </View>
        ) : null}
      </Pressable>
    ),
    [handleSelect, savingId, theme],
  );

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.background.val as string },
        ]}
      >
        <ActivityIndicator size="large" color={theme.accent.val as string} />
      </View>
    );
  }

  if (failed || options.length === 0) {
    return (
      <View
        style={[
          styles.container,
          styles.center,
          { backgroundColor: theme.background.val as string },
        ]}
      >
        <Text style={[styles.message, { color: theme.colorMuted.val as string }]}>
          {failed ? "Couldn't load images. Please try again." : "No images found for this recipe."}
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      style={[styles.container, { backgroundColor: theme.background.val as string }]}
      contentContainerStyle={styles.content}
      data={options}
      keyExtractor={(item) => item.id}
      renderItem={renderItem}
      numColumns={2}
      columnWrapperStyle={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  content: {
    padding: 12,
  },
  row: {
    gap: 12,
  },
  tile: {
    flex: 1,
    marginBottom: 12,
  },
  tileImage: {
    width: "100%",
    aspectRatio: 4 / 3,
    borderRadius: 12,
  },
  tileOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  tileScrim: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    opacity: 0.35,
  },
  message: {
    fontSize: 16,
    textAlign: "center",
  },
});
