/**
 * Learn more about deep linking with React Navigation
 * https://reactnavigation.org/docs/deep-linking
 * https://reactnavigation.org/docs/configuring-links
 */

import { LinkingOptions } from "@react-navigation/native";
import * as Linking from "expo-linking";

import { RootDrawerParamList } from "./types";

const prefix = Linking.createURL("/");

export const linkingOptions: LinkingOptions<RootDrawerParamList> = {
    prefixes: [prefix],
    config: {
        screens: {
            GroupList: "groups",
            GroupStackNavigator: {
                path: ":groupId",
                initialRouteName: "BottomTabNavigator",
                screens: {
                    BottomTabNavigator: {
                        initialRouteName: "TransactionList",
                        screens: {
                            TransactionList: "transactions",
                            AccountList: "personal-accounts",
                            ClearingAccountList: "personal-accounts",
                        },
                    },
                    AccountDetail: "accounts/:accountId",
                    AccountEdit: "accounts/:accountId/edit",
                    // TransactionDetail: "transaction/:transactionId",
                },
            },
            Preferences: "preferences",
            Login: "login",
            Register: "register",
            NotFound: "*",
        },
    },
};
