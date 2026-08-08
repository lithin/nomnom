import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useTheme } from "@tamagui/core";

type ChatInputProps = {
  value: string;
  isSending: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
};

export const ChatInput = ({ value, isSending, onChangeText, onSend }: ChatInputProps) => {
  const theme = useTheme();

  return (
    <View style={[styles.inputRow, { borderTopColor: theme.borderColor.val as string }]}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          { borderColor: theme.borderColor.val as string, color: theme.color.val as string },
        ]}
        placeholder="Type your message"
        placeholderTextColor={theme.colorMuted.val as string}
        editable={!isSending}
        multiline
      />
      <Pressable
        style={[
          styles.sendButton,
          { backgroundColor: theme.accent.val as string },
          isSending ? styles.sendButtonDisabled : null,
        ]}
        onPress={onSend}
        disabled={isSending}
      >
        <Text style={[styles.sendButtonText, { color: theme.color.val as string }]}>
          {isSending ? "..." : "Send"}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  inputRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  sendButton: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
