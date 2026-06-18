import { useColorScheme } from "react-native";
import { TamaguiProvider, Theme } from "tamagui/native";

import { tamaguiConfig } from "./config";

export function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? "dark" : "light";

  return (
    <TamaguiProvider config={tamaguiConfig}>
      <Theme name={theme}>{children}</Theme>
    </TamaguiProvider>
  );
}
