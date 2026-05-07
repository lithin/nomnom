import { memo, useEffect, useRef } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

import type { Message } from "../types";

const MessageItem = memo(({ item }: { item: Message }) => (
  <View
    style={[
      styles.messageBubble,
      item.role === "user" ? styles.userBubble : styles.assistantBubble,
    ]}
  >
    {item.role === "user" ? (
      <Text style={styles.messageText}>{item.text}</Text>
    ) : (
      <Markdown style={markdownStyles}>{item.text}</Markdown>
    )}
  </View>
));

type MessageListProps = {
  messages: Message[];
};

export const MessageList = ({ messages }: MessageListProps) => {
  const scrollViewRef = useRef<ScrollView>(null);
  const didInitialScrollRef = useRef(false);
  const scrollDebounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (scrollDebounceTimeoutRef.current) {
        clearTimeout(scrollDebounceTimeoutRef.current);
      }
    },
    [],
  );

  return (
    <ScrollView
      ref={scrollViewRef}
      style={styles.list}
      contentContainerStyle={styles.messagesContainer}
      onContentSizeChange={() => {
        if (scrollDebounceTimeoutRef.current) {
          clearTimeout(scrollDebounceTimeoutRef.current);
        }

        scrollDebounceTimeoutRef.current = setTimeout(() => {
          if (!didInitialScrollRef.current) {
            didInitialScrollRef.current = true;
            scrollViewRef.current?.scrollToEnd({ animated: false });
            return;
          }

          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }}
    >
      {messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>Ask me anything to start chatting.</Text>
        </View>
      ) : (
        messages.map((item) => <MessageItem key={item.id} item={item} />)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  list: {
    // flex: 1,
  },
  messagesContainer: {
    // flexGrow: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  messageBubble: {
    maxWidth: "84%",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  userBubble: {
    backgroundColor: "#dbeafe",
    alignSelf: "flex-end",
  },
  assistantBubble: {
    backgroundColor: "#e5e7eb",
  },
  messageText: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  emptyState: {
    flex: 1,
    paddingTop: 24,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 15,
    color: "#4b5563",
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    color: "#111827",
    fontSize: 16,
    lineHeight: 22,
    flexShrink: 1,
  },
  paragraph: {
    marginTop: 0,
    marginBottom: 10,
  },
  code_block: {
    backgroundColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
  },
  code_inline: {
    backgroundColor: "#d1d5db",
    color: "#111827",
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  bullet_list: {
    marginVertical: 6,
  },
  ordered_list: {
    marginVertical: 6,
  },
  heading1: {
    fontSize: 22,
    marginBottom: 8,
    color: "#111827",
  },
  heading2: {
    fontSize: 20,
    marginBottom: 6,
    color: "#111827",
  },
  heading3: {
    fontSize: 18,
    marginBottom: 6,
    color: "#111827",
  },
  blockquote: {
    borderLeftWidth: 4,
    borderLeftColor: "#9ca3af",
    paddingLeft: 10,
    marginVertical: 8,
  },
  hr: {
    backgroundColor: "#9ca3af",
    height: 1,
    marginVertical: 10,
  },
  link: {
    color: "#1d4ed8",
  },
});
