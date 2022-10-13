/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { DrawerScreenProps } from "@react-navigation/drawer";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

declare global {
    namespace ReactNavigation {
        type RootParamList = RootDrawerParamList;
    }
}

export type RootDrawerParamList = {
    GroupStackNavigator: NavigatorScreenParams<GroupStackParamList>;
    Home: undefined;
    Preferences: undefined;
    Profile: undefined;
    Login: undefined;
    Register: undefined;
    NotFound: undefined;
};

export type GroupStackParamList = {
    BottomTabNavigator: NavigatorScreenParams<GroupTabParamList>;
    TransactionDetail: {
        groupID: number;
        transactionID: number;
        editingStart: string | null;
    };
    AccountDetail: { groupID: number; accountID: number };
    AccountEdit: { groupID: number; accountID: number; editingStart: string };
};

export type GroupTabParamList = {
    TransactionList: undefined;
    AccountList: undefined;
    ClearingAccountList: undefined;
};

export type RootDrawerScreenProps<Screen extends keyof RootDrawerParamList> = DrawerScreenProps<
    RootDrawerParamList,
    Screen
>;
export type RootDrawerNavigationProp<Screen extends keyof RootDrawerParamList> =
    RootDrawerScreenProps<Screen>["navigation"];

export type GroupStackScreenProps<Screen extends keyof GroupStackParamList> = CompositeScreenProps<
    StackScreenProps<GroupStackParamList, Screen>,
    RootDrawerScreenProps<keyof RootDrawerParamList>
>;
export type GroupStackNavigationProp<Screen extends keyof GroupStackParamList> =
    GroupStackScreenProps<Screen>["navigation"];

export type GroupTabScreenProps<Screen extends keyof GroupTabParamList> = CompositeScreenProps<
    BottomTabScreenProps<GroupTabParamList, Screen>,
    CompositeScreenProps<
        GroupStackScreenProps<keyof GroupStackParamList>,
        RootDrawerScreenProps<keyof RootDrawerParamList>
    >
>;
export type GroupTabNavigationProp<Screen extends keyof GroupTabParamList> = GroupTabScreenProps<Screen>["navigation"];
