import { memo, useEffect, useRef } from "react";
import { ScrollView, StyleSheet } from "react-native";
import Markdown from "react-native-markdown-display";
import { Card, Text, useTheme, YStack } from "tamagui/native";

import type { Message } from "../types";

const MessageItem = memo(({ item }: { item: Message }) => {
  const theme = useTheme();
  const isUser = item.role === "user";

  const markdownStyles = StyleSheet.create({
    body: {
      color: theme.color.val as string,
      fontSize: 16,
      lineHeight: 22,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: 10,
    },
    code_block: {
      backgroundColor: theme.backgroundSecondary.val as string,
      borderRadius: 8,
      padding: 10,
    },
    code_inline: {
      backgroundColor: theme.backgroundSecondary.val as string,
      color: theme.color.val as string,
      borderRadius: 4,
      paddingHorizontal: 4,
    },
    bullet_list: { marginVertical: 6 },
    ordered_list: { marginVertical: 6 },
    heading1: { fontSize: 22, marginBottom: 8, color: theme.color.val as string },
    heading2: { fontSize: 20, marginBottom: 6, color: theme.color.val as string },
    heading3: { fontSize: 18, marginBottom: 6, color: theme.color.val as string },
    blockquote: {
      borderLeftWidth: 4,
      borderLeftColor: theme.borderColor.val as string,
      paddingLeft: 10,
      marginVertical: 8,
    },
    hr: {
      backgroundColor: theme.borderColor.val as string,
      height: 1,
      marginVertical: 10,
    },
    link: { color: theme.accent.val as string },
  });

  return (
    <Card
      maxWidth="84%"
      borderRadius={14}
      paddingHorizontal="$3"
      paddingVertical="$2"
      backgroundColor={isUser ? "$backgroundSecondary" : "$accent"}
      alignSelf={isUser ? "flex-end" : "flex-start"}
      unstyled
    >
      {isUser ? (
        <Text color="$color" fontSize="$4" lineHeight="$4">
          {item.text}
        </Text>
      ) : (
        <Markdown style={markdownStyles}>{item.text}</Markdown>
      )}
    </Card>
  );
});

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
        <YStack flex={1} paddingTop="$6" alignItems="center">
          <Text fontSize="$4" color="$color">
            Ask me anything to start chatting.
          </Text>
        </YStack>
      ) : (
        messages.map((item) => <MessageItem key={item.id} item={item} />)
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  messagesContainer: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
});
