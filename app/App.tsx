import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet, View } from "react-native";
import { useTheme } from "tamagui/native";

import { ChatNavigator } from "./src/chat/ChatNavigator";
import { RecipeDetailsScreen } from "./src/recipes/RecipeDetailsScreen";
import { RecipesScreen } from "./src/recipes/RecipesScreen";
import { AppThemeProvider } from "./src/theme/AppThemeProvider";
import { tokens } from "./src/theme/config";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RecipesStack() {
  const theme = useTheme();

  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RecipesList"
        component={RecipesScreen}
        options={{
          title: "Recipes",
          headerStyle: { backgroundColor: theme.backgroundPress.val as string },
          headerTitleStyle: { color: theme.titleText.val as string },
        }}
      />
      <Stack.Screen
        name="RecipeDetails"
        component={RecipeDetailsScreen}
        options={{
          title: "Recipe Details",
          headerStyle: { backgroundColor: theme.backgroundPress.val as string },
          headerTintColor: tokens.color.darkOlive.val as string,
          headerTitleStyle: { color: theme.titleText.val as string },
        }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <AppThemeProvider>
      <AppNavigation />
    </AppThemeProvider>
  );
}

function AppNavigation() {
  const theme = useTheme();

  return (
    <NavigationContainer>
      <View style={styles.appRoot}>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarStyle: {
              backgroundColor: theme.backgroundPress.val as string,
              height: 80,
              paddingTop: 10,
            },
            tabBarIcon: ({ focused, color, size }) => {
              let iconName = "";

              if (route.name === "Chat") {
                iconName = focused ? "chatbubbles" : "chatbubbles-outline";
              } else if (route.name === "Recipes") {
                iconName = focused ? "restaurant" : "restaurant-outline";
              }

              // biome-ignore lint/suspicious/noExplicitAny: library typing requires it
              return <Ionicons name={iconName as any} size={size} color={color} />;
            },
            tabBarActiveTintColor: theme.color.val as string,
            tabBarInactiveTintColor: theme.titleText.val as string,
          })}
        >
          <Tab.Screen name="Chat" component={ChatNavigator} options={{ headerShown: false }} />
          <Tab.Screen
            name="Recipes"
            component={RecipesStack}
            options={{ headerShown: false }}
            listeners={({ navigation }) => ({
              // Always open the list screen when pressing the Recipes tab
              // so users don't land on a previously opened details screen.
              tabPress: (event) => {
                event.preventDefault();
                navigation.navigate("Recipes", { screen: "RecipesList" });
              },
            })}
          />
        </Tab.Navigator>
      </View>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  appRoot: {
    flex: 1,
  },
});
