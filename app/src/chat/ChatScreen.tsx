import { useHeaderHeight } from "@react-navigation/elements";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { KeyboardAvoidingView, StyleSheet, View } from "react-native";
import { useTheme } from "@tamagui/core";

import { ChatInput } from "./components/ChatInput";
import { MessageList } from "./components/MessageList";
import type { Message } from "./types";

type ChatScreenProps = {
  activeChatId?: string;
  messages: Message[];
  input: string;
  isSending: boolean;
  onChangeInput: (value: string) => void;
  onSend: () => void;
};

export function ChatScreen({
  activeChatId,
  messages,
  input,
  isSending,
  onChangeInput,
  onSend,
}: ChatScreenProps) {
  const headerHeight = useHeaderHeight();
  const theme = useTheme();
  const [keyboardOffset, setKeyboardOffset] = useState(0);

  // biome-ignore lint/correctness/useExhaustiveDependencies: onMount
  useEffect(() => {
    // header height is correct for keyboard avoiding view only at first load
    setKeyboardOffset(headerHeight);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: theme.background.val as string }]}>
      <KeyboardAvoidingView
        style={[styles.container, { backgroundColor: theme.background.val as string }]}
        behavior="padding"
        keyboardVerticalOffset={keyboardOffset}
      >
        <MessageList key={activeChatId ?? "new-chat"} messages={messages} />
        <ChatInput
          value={input}
          onChangeText={onChangeInput}
          isSending={isSending}
          onSend={onSend}
        />
        <StatusBar style="auto" />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
