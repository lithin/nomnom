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

import { ListCard } from "../../components/ListCard";
import { getChatsPage } from "../api";
import type { ChatHistoryItem } from "../types";

type ChatHistoryDrawerProps = {
  visible: boolean;
  onClose: () => void;
  onSelectChat: (chatId: string) => void;
  onStartNewChat: () => void;
};

const PAGE_SIZE = 10;

const ChatHistoryRow = memo(
  ({ item, onSelectChat }: { item: ChatHistoryItem; onSelectChat: (chatId: string) => void }) => (
    <ListCard title={item.title} onPress={() => onSelectChat(item.id)} numberOfLines={2} />
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
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const activeHistoryRequestId = useRef(0);
  const isLoadingMoreHistoryRef = useRef(false);
  const shouldStopAutoLoadingRef = useRef(false);

  const loadInitialHistory = useCallback(async () => {
    const requestId = activeHistoryRequestId.current + 1;
    activeHistoryRequestId.current = requestId;

    setHistoryLoadError(null);
    shouldStopAutoLoadingRef.current = false;
    setLoadingHistory(true);
    setLoadingMoreHistory(false);
    isLoadingMoreHistoryRef.current = false;

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
        setHasMoreHistory(false);
        shouldStopAutoLoadingRef.current = true;
        setHistoryLoadError("Failed to load chat history. Please try again later.");
      }
    } finally {
      if (activeHistoryRequestId.current === requestId) {
        setLoadingHistory(false);
      }
    }
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (
      !hasMoreHistory ||
      isLoadingHistory ||
      isLoadingMoreHistoryRef.current ||
      shouldStopAutoLoadingRef.current
    ) {
      return;
    }

    isLoadingMoreHistoryRef.current = true;
    setLoadingMoreHistory(true);

    try {
      const offset = historyOffset;
      const nextPage = await getChatsPage({ limit: PAGE_SIZE, offset });
      setChatHistory((previous) => [...previous, ...nextPage.chats]);
      setHistoryOffset(offset + nextPage.chats.length);
      setHasMoreHistory(nextPage.hasMore);
    } catch (error) {
      console.error("Failed to load more chat history", error);
      setHasMoreHistory(false);
      shouldStopAutoLoadingRef.current = true;
      setHistoryLoadError("Failed to load chat history. Please try again later.");
    } finally {
      isLoadingMoreHistoryRef.current = false;
      setLoadingMoreHistory(false);
    }
  }, [hasMoreHistory, historyOffset, isLoadingHistory]);

  const handleSelectChat = useCallback(
    (chatId: string) => {
      onSelectChat(chatId);
      onClose();
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
                  <Text style={styles.emptyStateText}>{historyLoadError ?? "No chats yet."}</Text>
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
