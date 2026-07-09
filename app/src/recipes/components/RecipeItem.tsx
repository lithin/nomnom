import { memo } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useTheme } from "tamagui/native";

import type { Recipe } from "../types";

export const RecipeItem = memo(
  ({ item, onPress }: { item: Recipe; onPress: (recipe: Recipe) => void }) => {
    const theme = useTheme();

    return (
      <TouchableOpacity
        style={[styles.card, { shadowColor: theme.darkOlive.val as string }]}
        onPress={() => onPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.imageContainer}>
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.imagePlaceholder,
                { backgroundColor: theme.backgroundSecondary.val as string },
              ]}
            />
          )}
        </View>
        <View style={[styles.titleContainer, { backgroundColor: theme.background.val as string }]}>
          <Text style={[styles.title, { color: theme.titleText.val as string }]} numberOfLines={1}>
            {item.title}
          </Text>
        </View>
      </TouchableOpacity>
    );
  },
);

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    marginBottom: 16,
    overflow: "hidden",
    height: 220,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 3,
  },
  imageContainer: {
    flex: 3,
  },
  image: {
    width: "100%",
    height: "100%",
  },
  imagePlaceholder: {
    flex: 1,
  },
  titleContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
});
