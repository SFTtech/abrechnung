/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";
import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { AccountType } from "./core/types";

declare global {
    namespace ReactNavigation {
        interface RootParamList extends RootDrawerParamList {
        }
    }
}

export type RootDrawerParamList = {
    GroupStackNavigator: NavigatorScreenParams<GroupStackParamList> | undefined;
    Home: undefined;
    Preferences: undefined;
    Profile: undefined;
    Login: undefined;
    Register: undefined;
    NotFound: undefined;
};

export type RootDrawerScreenProps<Screen extends keyof RootDrawerParamList> = NativeStackScreenProps<RootDrawerParamList,
    Screen>;

export type GroupStackParamList = {
    BottomTabNavigator: NavigatorScreenParams<GroupTabParamList> | undefined;
    TransactionDetail: { groupID: number, transactionID: number, editingStart: string | null };
    AccountDetail: { groupID: number, accountID: number };
    AccountEdit: { groupID: number, accountID: number, editingStart: string };
}
export type GroupStackScreenProps<Screen extends keyof GroupStackParamList> = NativeStackScreenProps<GroupStackParamList,
    Screen>;

export type GroupTabParamList = {
    TransactionList: undefined;
    AccountList: undefined;
    ClearingAccountList: undefined;
};

export type GroupTabScreenProps<Screen extends keyof GroupTabParamList> = CompositeScreenProps<BottomTabScreenProps<GroupTabParamList, Screen>,
    NativeStackScreenProps<GroupStackParamList>>;

