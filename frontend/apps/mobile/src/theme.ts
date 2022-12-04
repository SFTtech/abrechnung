import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from "react-native-paper";
import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from "@react-navigation/native";
import merge from "deepmerge";

export const successColor = "#2f8a0c";

const { LightTheme, DarkTheme } = adaptNavigationTheme({ light: NavigationLightTheme, dark: NavigationDarkTheme });

export const CustomDarkTheme = merge(DarkTheme, MD3DarkTheme);
export const CustomLightTheme = merge(LightTheme, MD3LightTheme);

export type Theme = typeof CustomDarkTheme;
