import Ionicons from "@expo/vector-icons/Ionicons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { StatusBar } from "expo-status-bar";
import { StyleSheet } from "react-native";
import { ChatScreen } from "./src/chat/ChatScreen";
import { RecipeDetailsScreen } from "./src/recipes/RecipeDetailsScreen";
import { RecipesScreen } from "./src/recipes/RecipesScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function RecipesStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="RecipesList"
        component={RecipesScreen}
        options={{ title: "Recipes", headerTitleAlign: "center" }}
      />
      <Stack.Screen
        name="RecipeDetails"
        component={RecipeDetailsScreen}
        options={{ title: "Recipe Details", headerTitleAlign: "center" }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
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
          tabBarActiveTintColor: "#007aff",
          tabBarInactiveTintColor: "gray",
          headerTitleAlign: "center",
        })}
      >
        <Tab.Screen name="Chat" component={ChatScreen} />
        <Tab.Screen
          name="Recipes"
          component={RecipesStack}
          options={{ headerShown: false }}
          listeners={({ navigation }) => ({
            tabPress: (event) => {
              event.preventDefault();
              navigation.navigate("Recipes", { screen: "RecipesList" });
            },
          })}
        />
      </Tab.Navigator>
      <StatusBar style="auto" />
    </NavigationContainer>
  );
}

const _styles = StyleSheet.create({});
