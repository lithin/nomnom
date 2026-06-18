import { memo } from "react";

import { ListCard } from "../../components/ListCard";
import type { Recipe } from "../types";

export const RecipeItem = memo(
  ({ item, onPress }: { item: Recipe; onPress: (recipe: Recipe) => void }) => (
    <ListCard title={item.title} onPress={() => onPress(item)} />
  ),
);
