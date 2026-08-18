import { TamaguiProvider } from "@tamagui/core";
import { useColorScheme } from "react-native";

import { tamaguiConfig } from "./config";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";

  return (
    <TamaguiProvider config={tamaguiConfig} defaultTheme={theme}>
      {children}
    </TamaguiProvider>
  );
}
