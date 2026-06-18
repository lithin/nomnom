import Ionicons from "@expo/vector-icons/Ionicons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useEffect } from "react";
import { TouchableOpacity, View } from "react-native";
import { useTheme } from "tamagui/native";

import { ChatHistoryScreen } from "./ChatHistoryScreen";
import { ChatScreen } from "./ChatScreen";
import { useChat } from "./useChat";

type ChatStackParamList = {
  ChatMain: { chatId?: string } | undefined;
  ChatHistory: undefined;
};

const Stack = createNativeStackNavigator<ChatStackParamList>();

type ChatMainContentProps = {
  chatId?: string;
  messages: ReturnType<typeof useChat>["messages"];
  input: string;
  isSending: boolean;
  isHydrating: boolean;
  setInput: (value: string) => void;
  handleSend: () => void;
  loadChatById: (chatId?: string) => Promise<void>;
};

function ChatMainContent({
  chatId,
  messages,
  input,
  isSending,
  isHydrating,
  setInput,
  handleSend,
  loadChatById,
}: ChatMainContentProps) {
  useEffect(() => {
    void loadChatById(chatId);
  }, [chatId, loadChatById]);

  return (
    <ChatScreen
      activeChatId={chatId}
      messages={messages}
      input={input}
      isSending={isSending || isHydrating}
      onChangeInput={setInput}
      onSend={handleSend}
    />
  );
}

export function ChatNavigator() {
  const theme = useTheme();
  const {
    messages,
    input,
    isSending,
    isHydrating,
    setInput,
    handleSend,
    startNewChat,
    loadChatById,
  } = useChat();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="ChatMain"
        options={({ navigation }) => ({
          title: "Chat",
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: theme.backgroundPress.val as string },
          headerTitleStyle: { color: theme.titleText.val as string },
          headerRight: () => (
            <View style={{ flexDirection: "row", gap: 16, marginRight: 4 }}>
              <TouchableOpacity
                onPress={() => navigation.navigate("ChatHistory")}
                accessibilityRole="button"
                accessibilityLabel="Open chat history"
              >
                <Ionicons name="search-outline" size={22} color={theme.titleText.val as string} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={startNewChat}
                accessibilityRole="button"
                accessibilityLabel="Start new chat"
              >
                <Ionicons name="add" size={24} color={theme.titleText.val as string} />
              </TouchableOpacity>
            </View>
          ),
        })}
      >
        {({ route }) => (
          <ChatMainContent
            chatId={route.params?.chatId}
            messages={messages}
            input={input}
            isSending={isSending}
            isHydrating={isHydrating}
            setInput={setInput}
            handleSend={handleSend}
            loadChatById={loadChatById}
          />
        )}
      </Stack.Screen>

      <Stack.Screen
        name="ChatHistory"
        options={({ navigation }) => ({
          title: "Chat History",
          headerTitleAlign: "left",
          headerStyle: { backgroundColor: theme.backgroundPress.val as string },
          headerTitleStyle: { color: theme.titleText.val as string },
          presentation: "card",
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Back to chat"
              style={{ marginRight: 12 }}
            >
              <Ionicons name="chevron-back" size={24} color={theme.titleText.val as string} />
            </TouchableOpacity>
          ),
        })}
      >
        {({ navigation }) => (
          <ChatHistoryScreen
            onSelectChat={(chatId) => {
              navigation.navigate("ChatMain", { chatId });
            }}
          />
        )}
      </Stack.Screen>
    </Stack.Navigator>
  );
}
