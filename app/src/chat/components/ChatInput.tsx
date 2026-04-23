import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

type ChatInputProps = {
  value: string;
  isSending: boolean;
  onChangeText: (value: string) => void;
  onSend: () => void;
};

export const ChatInput = ({ value, isSending, onChangeText, onSend }: ChatInputProps) => {
  return (
    <View style={styles.inputRow}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={styles.input}
        placeholder="Type your message"
        editable={!isSending}
        multiline
      />
      <Pressable
        style={[styles.sendButton, isSending ? styles.sendButtonDisabled : null]}
        onPress={onSend}
        disabled={isSending}
      >
        <Text style={styles.sendButtonText}>{isSending ? "..." : "Send"}</Text>
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
    borderTopColor: "#d1d5db",
    backgroundColor: "#ffffff",
  },
  input: {
    flex: 1,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: "#9ca3af",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ffffff",
    fontSize: 16,
  },
  sendButton: {
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});
