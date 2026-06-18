import { memo } from "react";
import {
  type StyleProp,
  StyleSheet,
  Text,
  type TextStyle,
  TouchableOpacity,
  type ViewStyle,
} from "react-native";

type ListCardProps = {
  title: string;
  onPress: () => void;
  numberOfLines?: number;
  containerStyle?: StyleProp<ViewStyle>;
  titleStyle?: StyleProp<TextStyle>;
};

export const ListCard = memo(
  ({ title, onPress, numberOfLines, containerStyle, titleStyle }: ListCardProps) => (
    <TouchableOpacity style={[styles.card, containerStyle]} onPress={onPress}>
      <Text style={[styles.title, titleStyle]} numberOfLines={numberOfLines}>
        {title}
      </Text>
    </TouchableOpacity>
  ),
);

const styles = StyleSheet.create({
  card: {
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
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
});
