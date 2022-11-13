/**
 * Learn more about using TypeScript with React Navigation:
 * https://reactnavigation.org/docs/typescript/
 */

import { CompositeScreenProps, NavigatorScreenParams } from "@react-navigation/native";
import { StackScreenProps } from "@react-navigation/stack";
import { DrawerScreenProps } from "@react-navigation/drawer";
import { BottomTabScreenProps } from "@react-navigation/bottom-tabs";

declare global {
    // eslint-disable-next-line @typescript-eslint/no-namespace
    namespace ReactNavigation {
        // @ts-ignore
        type RootParamList = RootDrawerParamList;
    }
}

export type RootDrawerParamList = {
    GroupStackNavigator: NavigatorScreenParams<GroupStackParamList>;
    GroupList: undefined;
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
        groupId: number;
        transactionId: number;
        editing: boolean;
    };
    AccountDetail: { groupId: number; accountId: number };
    AccountEdit: { groupId: number; accountId: number };
};

export type GroupTabParamList = {
    TransactionList: { groupId: number };
    AccountList: { groupId: number };
    ClearingAccountList: { groupId: number };
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
