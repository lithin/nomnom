import Ionicons from "@expo/vector-icons/Ionicons";
import { useHeaderHeight } from "@react-navigation/elements";
import { useNavigation, useRoute } from "@react-navigation/native";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, TouchableOpacity } from "react-native";
import { ChatHistoryDrawer } from "./components/ChatHistoryDrawer";
import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import type { Message } from "./types";
import { useChat } from "./useChat";

export function ChatScreen() {
  // biome-ignore lint/suspicious/noExplicitAny: route params are dynamic across navigators
  const route = useRoute<any>();
  const initialMessages = route.params?.initialMessages as Message[] | undefined;
  const initialChatId = route.params?.chatId as string | undefined;

  const { messages, input, isSending, setInput, handleSend, startNewChat, hydrateChat } = useChat(
    initialMessages,
    initialChatId,
  );
  const navigation = useNavigation();
  const headerHeight = useHeaderHeight();
  const [isHistoryVisible, setHistoryVisible] = useState(false);

  const openHistory = useCallback(() => {
    setHistoryVisible(true);
  }, []);

  const selectChat = useCallback(
    (persistedMessages: Message[], chatId: string) => {
      hydrateChat(persistedMessages, chatId);
      setHistoryVisible(false);
    },
    [hydrateChat],
  );

  const handleStartNewFromDrawer = useCallback(() => {
    startNewChat();
    setHistoryVisible(false);
  }, [startNewChat]);

  useEffect(() => {
    if (initialMessages && initialMessages.length > 0) {
      hydrateChat(initialMessages, initialChatId);
    }
  }, [initialMessages, initialChatId, hydrateChat]);

  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={openHistory} style={styles.headerButtonLeft}>
          <Ionicons name="menu" size={24} color="#0f766e" />
        </TouchableOpacity>
      ),
      headerRight: undefined,
    });
  }, [navigation, openHistory]);

  return (
    <>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={headerHeight}
      >
        <MessageList messages={messages} />
        <ChatInput
          value={input}
          onChangeText={setInput}
          isSending={isSending}
          onSend={handleSend}
        />
        <StatusBar style="auto" />
      </KeyboardAvoidingView>

      <ChatHistoryDrawer
        visible={isHistoryVisible}
        onClose={() => setHistoryVisible(false)}
        onSelectChat={selectChat}
        onStartNewChat={handleStartNewFromDrawer}
      />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerButtonLeft: {
    marginLeft: 12,
  },
});
