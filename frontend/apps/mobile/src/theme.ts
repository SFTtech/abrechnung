import { MD3LightTheme as PaperDefaultTheme, MD3DarkTheme as PaperDarkTheme } from "react-native-paper";
import {DarkTheme as NavigationDarkTheme, DefaultTheme as NavigationDefaultTheme} from "@react-navigation/native";
import merge from "deepmerge";

export const successColor = "#2f8a0c"
export const CombinedDarkTheme = merge(PaperDarkTheme, NavigationDarkTheme);
export const CombinedDefaultTheme = merge(PaperDefaultTheme, NavigationDefaultTheme);
