import { useEffect, useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    Modal,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";

interface DrawerMenuProps {
    visible: boolean;
    onClose: () => void;
    onNewChat: () => void;
}

const { width } = Dimensions.get("window");
const DRAWER_WIDTH = width * 0.75;

export function DrawerMenu({ visible, onClose, onNewChat }: DrawerMenuProps) {
    const [showModal, setShowModal] = useState(visible);
    const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setShowModal(true);
            // Animation will be triggered by Modal's onShow callback
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: -DRAWER_WIDTH,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowModal(false);
            });
        }
    }, [visible, slideAnim, fadeAnim]);

    const animateIn = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: true,
            }),
        ]).start();
    };

    return (
        <Modal
            visible={showModal}
            transparent
            animationType="none"
            onRequestClose={onClose}
            onShow={animateIn}
        >
            <View style={styles.overlayContainer}>
                <TouchableWithoutFeedback onPress={onClose}>
                    <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                </TouchableWithoutFeedback>
                <Animated.View style={[styles.drawer, { transform: [{ translateX: slideAnim }] }]}>
                    <SafeAreaView style={styles.safeArea}>
                        <View style={styles.content}>
                            <Text style={styles.header}>Menu</Text>
                            <TouchableOpacity
                                style={styles.menuItem}
                                onPress={() => {
                                    onNewChat();
                                    onClose();
                                }}
                            >
                                <Text style={styles.menuText}>Start New Chat</Text>
                            </TouchableOpacity>
                        </View>
                    </SafeAreaView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlayContainer: {
        flex: 1,
        flexDirection: "row",
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0, 0, 0, 0.5)",
    },
    drawer: {
        width: DRAWER_WIDTH,
        height: "100%",
        backgroundColor: "#ffffff",
        shadowColor: "#000",
        shadowOffset: {
            width: 2,
            height: 0,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        paddingTop: 20,
    },
    header: {
        fontSize: 24,
        fontWeight: "bold",
        paddingHorizontal: 20,
        marginBottom: 20,
        color: "#333",
    },
    menuItem: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#f0f0f0",
    },
    menuText: {
        fontSize: 16,
        color: "#007aff",
    },
});
