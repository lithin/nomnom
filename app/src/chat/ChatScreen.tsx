import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import type { Message } from "./types";
import { useChat } from "./useChat";

export function ChatScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: route params are dynamic across navigators
  const route = useRoute<any>();
  const initialMessages = route.params?.initialMessages as Message[] | undefined;
  const editingRecipeId = route.params?.editingRecipeId as string | undefined;

  const { messages, input, isSending, setInput, handleSend, startNewChat, hydrateChat } = useChat(
    initialMessages,
    editingRecipeId,
  );
  const navigation = useNavigation();

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      hydrateChat(initialMessages, editingRecipeId);
    }
  }, [initialMessages, editingRecipeId, hydrateChat]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity onPress={startNewChat} style={styles.headerButton}>
          <Ionicons name="create-outline" size={24} color="#007aff" />
        </TouchableOpacity>
      ),
    });
  }, [navigation, startNewChat]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
    >
      <MessageList messages={messages} />
      <ChatInput value={input} onChangeText={setInput} isSending={isSending} onSend={handleSend} />
      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  headerButton: {
    marginRight: 16,
  },
});
