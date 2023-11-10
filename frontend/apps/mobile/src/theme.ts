import { DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationLightTheme } from "@react-navigation/native";
import merge from "deepmerge";
import { MD3DarkTheme, MD3LightTheme, adaptNavigationTheme } from "react-native-paper";

export const successColor = "#2f8a0c";

const { LightTheme, DarkTheme } = adaptNavigationTheme({
    reactNavigationLight: NavigationLightTheme,
    reactNavigationDark: NavigationDarkTheme,
});

export const CustomDarkTheme = merge(DarkTheme, MD3DarkTheme);
export const CustomLightTheme = merge(LightTheme, MD3LightTheme);

export type Theme = typeof CustomDarkTheme;
