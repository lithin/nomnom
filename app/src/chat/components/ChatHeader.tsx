import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
    onNewChat: () => void;
}

export function ChatHeader({ onNewChat }: ChatHeaderProps) {
    return (
        <View style={styles.header}>
            <Text style={styles.title}>Chat</Text>
            <TouchableOpacity onPress={onNewChat} style={styles.button}>
                <Text style={styles.buttonText}>New Chat</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        backgroundColor: "#ffffff",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333333",
    },
    button: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: "#007aff",
        borderRadius: 6,
    },
    buttonText: {
        color: "#ffffff",
        fontSize: 14,
        fontWeight: "500",
    },
});
