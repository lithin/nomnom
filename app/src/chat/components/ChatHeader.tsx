import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChatHeaderProps {
    onMenuPress: () => void;
}

export function ChatHeader({ onMenuPress }: ChatHeaderProps) {
    return (
        <View style={styles.header}>
            <TouchableOpacity onPress={onMenuPress} style={styles.menuButton}>
                <Text style={styles.menuButtonText}>☰</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Chat</Text>
            <View style={styles.placeholder} />
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
    menuButton: {
        padding: 8,
    },
    menuButtonText: {
        fontSize: 24,
        color: "#333333",
    },
    title: {
        fontSize: 18,
        fontWeight: "600",
        color: "#333333",
    },
    placeholder: {
        width: 40, // To balance the header layout with the menu button
    },
});
