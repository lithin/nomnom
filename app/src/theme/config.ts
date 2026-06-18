import { createFont, createTamagui, createTokens } from "tamagui/native";

const bodyFont = createFont({
  family: "System",
  size: {
    1: 12,
    2: 14,
    3: 15,
    4: 16,
    5: 18,
    6: 20,
    7: 24,
    8: 28,
    true: 16,
  },
  lineHeight: {
    4: 22,
    true: 22,
  },
  weight: {
    true: "400",
  },
  letterSpacing: {
    true: 0,
  },
});

export const tokens = createTokens({
  color: {
    white: "#ffffff",
    crispCream: "#f5f7f5",
    sage: "#c1d0c1",
    sageMedium: "#99ad98",
    sageDark: "#5f7a5e",
    darkOlive: "#1a241a",
    peach: "#ffa683",
    peachSoft: "#ffb38e",
    charcoal: "#181e18",
    deepSage: "#242e24",
    transparent: "transparent",
  },
  space: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    5: 20,
    6: 24,
    7: 32,
    true: 8,
  },
  size: {
    0: 0,
    1: 4,
    2: 8,
    3: 16,
    4: 24,
    5: 32,
    6: 48,
    true: 16,
  },
  radius: {
    0: 0,
    1: 4,
    2: 8,
    3: 12,
    4: 16,
    true: 8,
  },
  zIndex: {
    0: 0,
    1: 100,
    2: 200,
    3: 300,
  },
});

const lightTheme = {
  background: tokens.color.white,
  backgroundPress: tokens.color.sage,
  color: tokens.color.darkOlive,
  darkOlive: tokens.color.darkOlive,
  titleText: tokens.color.darkOlive,
  borderColor: tokens.color.sageMedium,
  colorMuted: tokens.color.sageDark,
  accent: tokens.color.peachSoft,
};

const darkTheme = {
  background: tokens.color.charcoal,
  backgroundPress: tokens.color.deepSage,
  color: tokens.color.sage,
  darkOlive: tokens.color.darkOlive,
  titleText: tokens.color.crispCream,
  borderColor: tokens.color.sageDark,
  colorMuted: tokens.color.peachSoft,
  accent: tokens.color.peach,
};

export const tamaguiConfig = createTamagui({
  defaultFont: "body",
  fonts: { body: bodyFont },
  tokens,
  themes: {
    light: lightTheme,
    dark: darkTheme,
  },
  shorthands: {} as const,
  media: {},
});

export type AppConfig = typeof tamaguiConfig;

declare module "tamagui" {
  interface TamaguiCustomConfig extends AppConfig {}
}
