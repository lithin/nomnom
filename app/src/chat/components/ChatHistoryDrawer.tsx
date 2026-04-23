import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Drawer } from "react-native-drawer-layout";
import { getChatMessages, getChatsPage } from "../api";
import type { ChatHistoryItem, Message } from "../types";

type ChatHistoryDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectChat: (messages: Message[], chatId: string) => void;
  onStartNewChat: () => void;
};

const PAGE_SIZE = 10;

const ChatHistoryRow = memo(
  ({ item, onSelectChat }: { item: ChatHistoryItem; onSelectChat: (chatId: string) => void }) => (
    <TouchableOpacity style={styles.chatRow} onPress={() => onSelectChat(item.id)}>
      <Text style={styles.chatTitle} numberOfLines={2}>
        {item.title}
      </Text>
    </TouchableOpacity>
  ),
);

export const ChatHistoryDrawer = ({
  visible,
  onClose,
  onSelectChat,
  onStartNewChat,
}: ChatHistoryDrawerProps) => {
  const [chatHistory, setChatHistory] = useState<ChatHistoryItem[]>([]);
  const [historyOffset, setHistoryOffset] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isLoadingHistory, setLoadingHistory] = useState(false);
  const [isLoadingMoreHistory, setLoadingMoreHistory] = useState(false);
  const activeHistoryRequestId = useRef(0);

  const loadInitialHistory = useCallback(async () => {
    const requestId = activeHistoryRequestId.current + 1;
    activeHistoryRequestId.current = requestId;

    setLoadingHistory(true);
    setLoadingMoreHistory(false);

    try {
      const nextPage = await getChatsPage({ limit: PAGE_SIZE, offset: 0 });

      if (activeHistoryRequestId.current !== requestId) {
        return;
      }

      setChatHistory(nextPage.chats);
      setHistoryOffset(nextPage.chats.length);
      setHasMoreHistory(nextPage.hasMore);
    } catch (error) {
      if (activeHistoryRequestId.current === requestId) {
        console.error("Failed to load chat history", error);
      }
    } finally {
      if (activeHistoryRequestId.current === requestId) {
        setLoadingHistory(false);
      }
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (!hasMoreHistory || isLoadingMoreHistory || isLoadingHistory) {
      return;
    }

    setLoadingMoreHistory(true);

    try {
      const offset = historyOffset;
      const nextPage = await getChatsPage({ limit: PAGE_SIZE, offset });
      setChatHistory((previous) => [...previous, ...nextPage.chats]);
      setHistoryOffset(offset + nextPage.chats.length);
      setHasMoreHistory(nextPage.hasMore);
    } catch (error) {
      console.error("Failed to load more chat history", error);
    } finally {
      setLoadingMoreHistory(false);
    }
  }, [hasMoreHistory, historyOffset, isLoadingHistory, isLoadingMoreHistory]);

  const handleSelectChat = useCallback(
    async (chatId: string) => {
      try {
        const persistedMessages = await getChatMessages(chatId);
        onSelectChat(persistedMessages, chatId);
        onClose();
      } catch (error) {
        console.error("Failed to hydrate selected chat", error);
      }
    },
    [onClose, onSelectChat],
  );

  useEffect(() => {
    if (visible) {
      void loadInitialHistory();
    }
  }, [loadInitialHistory, visible]);

  return (
    <Drawer
      open={visible}
      onOpen={() => {}}
      onClose={onClose}
      drawerPosition="left"
      drawerType="front"
      drawerStyle={styles.drawer}
      overlayStyle={styles.overlay}
      renderDrawerContent={() => (
        <View style={styles.drawerContent}>
          <TouchableOpacity style={styles.newChatButton} onPress={onStartNewChat}>
            <Text style={styles.newChatButtonText}>Start new chat</Text>
          </TouchableOpacity>

          {isLoadingHistory ? (
            <View style={styles.centeredArea}>
              <ActivityIndicator size="small" color="#0f766e" />
            </View>
          ) : (
            <FlatList
              data={chatHistory}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <ChatHistoryRow item={item} onSelectChat={handleSelectChat} />
              )}
              contentContainerStyle={styles.listContainer}
              onEndReachedThreshold={0.35}
              onEndReached={() => {
                if (!isLoadingMoreHistory && hasMoreHistory) {
                  void loadMoreHistory();
                }
              }}
              ListEmptyComponent={
                <View style={styles.centeredArea}>
                  <Text style={styles.emptyStateText}>No chats yet.</Text>
                </View>
              }
              ListFooterComponent={
                isLoadingMoreHistory ? (
                  <View style={styles.footerLoading}>
                    <ActivityIndicator size="small" color="#0f766e" />
                  </View>
                ) : null
              }
            />
          )}
        </View>
      )}
    >
      <View style={styles.drawerBackdropContent} />
    </Drawer>
  );
};

const styles = StyleSheet.create({
  overlay: {
    backgroundColor: "rgba(17, 24, 39, 0.3)",
  },
  drawer: {
    width: "82%",
    maxWidth: 340,
    backgroundColor: "#f8fafc",
  },
  drawerContent: {
    flex: 1,
    paddingTop: 16,
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  drawerBackdropContent: {
    flex: 1,
  },
  newChatButton: {
    backgroundColor: "#ccfbf1",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 9,
    marginBottom: 12,
  },
  newChatButtonText: {
    color: "#134e4a",
    fontSize: 14,
    fontWeight: "600",
  },
  listContainer: {
    paddingBottom: 12,
  },
  chatRow: {
    backgroundColor: "#e2e8f0",
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 10,
    marginBottom: 8,
  },
  chatTitle: {
    color: "#111827",
    fontSize: 14,
    fontWeight: "600",
  },
  centeredArea: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyStateText: {
    color: "#475569",
    fontSize: 14,
  },
  footerLoading: {
    paddingVertical: 12,
    alignItems: "center",
  },
});
