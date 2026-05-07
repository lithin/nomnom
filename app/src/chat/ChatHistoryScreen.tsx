import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { getChatsPage } from "./api";
import type { ChatHistoryItem } from "./types";

type ChatHistoryScreenProps = {
  onSelectChat: (chatId: string) => void;
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

export const ChatHistoryScreen = ({ onSelectChat }: ChatHistoryScreenProps) => {
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
    },
    [onSelectChat],
  );

  useEffect(() => {
    void loadInitialHistory();
  }, [loadInitialHistory]);

  if (isLoadingHistory) {
    return (
      <View style={styles.centeredArea}>
        <ActivityIndicator size="small" color="#0f766e" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={chatHistory}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatHistoryRow item={item} onSelectChat={handleSelectChat} />}
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
    paddingHorizontal: 14,
    paddingTop: 12,
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
    flex: 1,
    paddingVertical: 24,
    alignItems: "center",
    justifyContent: "center",
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
