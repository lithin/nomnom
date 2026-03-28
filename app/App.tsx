import { StatusBar } from "expo-status-bar";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet } from "react-native";

import { ChatInput } from "./src/chat/components/ChatInput";
import { MessageList } from "./src/chat/components/MessageList";
import { useChat } from "./src/chat/useChat";

export default function App() {
  const { messages, input, isSending, setInput, handleSend } = useChat();

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <MessageList messages={messages} />
        <ChatInput
          value={input}
          onChangeText={setInput}
          isSending={isSending}
          onSend={handleSend}
        />
      </KeyboardAvoidingView>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  container: {
    flex: 1,
  },
});
