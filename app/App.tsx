import { StatusBar } from "expo-status-bar";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, StyleSheet } from "react-native";

import { ChatHeader } from "./src/chat/components/ChatHeader";
import { ChatInput } from "./src/chat/components/ChatInput";
import { DrawerMenu } from "./src/chat/components/DrawerMenu";
import { MessageList } from "./src/chat/components/MessageList";
import { useChat } from "./src/chat/useChat";

export default function App() {
  const { messages, input, isSending, setInput, handleSend, startNewChat } = useChat();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ChatHeader onMenuPress={() => setIsDrawerOpen(true)} />
      <DrawerMenu
        visible={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onNewChat={startNewChat}
      />
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
