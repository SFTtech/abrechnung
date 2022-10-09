/**
 * Learn more about deep linking with React Navigation
 * https://reactnavigation.org/docs/deep-linking
 * https://reactnavigation.org/docs/configuring-links
 */

import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

import { RootDrawerParamList } from "./types";

const linking: LinkingOptions<RootDrawerParamList> = {
    prefixes: [Linking.makeUrl("/")],
    config: {
        screens: {
            Root: {
                screens: {
                    TabOne: {
                        screens: {
                            TabOneScreen: "one",
                        },
                    },
                    TabTwo: {
                        screens: {
                            TabTwoScreen: "two",
                        },
                    },
                },
            },
            Modal: "modal",
            NotFound: "*",
        },
    },
};

export default linking;
