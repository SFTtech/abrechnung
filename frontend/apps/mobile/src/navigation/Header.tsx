import { Appbar, useTheme } from "react-native-paper";
import * as React from "react";
import { StackHeaderProps, StackNavigationProp } from "@react-navigation/stack";
import { GroupStackParamList, GroupTabParamList, RootDrawerParamList } from "./types";
import { DrawerNavigationProp } from "@react-navigation/drawer";
import { BottomTabNavigationProp } from "@react-navigation/bottom-tabs";
import { Route } from "@react-navigation/native";
import { HeaderTitleProps } from "@react-navigation/elements";

type Props = StackHeaderProps;

export interface HeaderOptions {
    title?: string;
    headerTitle?: string | ((props: HeaderTitleProps) => React.ReactNode);
    titleShown?: boolean;
    onGoBack?: (() => void) | (() => Promise<void>);
    headerRight?: (props: Record<string, never>) => React.ReactNode;
}

export interface HeaderProps {
    back?: {
        /**
         * Title of the previous screen.
         */
        title: string;
    };
    options: HeaderOptions;
    navigation:
        | DrawerNavigationProp<RootDrawerParamList>
        | BottomTabNavigationProp<GroupTabParamList>
        | StackNavigationProp<GroupStackParamList>;
    route: Route<string>;
}

export const Header: React.FC<Props> = ({ navigation, route, options, back }) => {
    const title =
        options.headerTitle !== undefined
            ? options.headerTitle
            : options.title !== undefined
            ? options.title
            : route.name;
    const showTitle = options.titleShown ?? true;

    const theme = useTheme();

    const openDrawer = () => {
        if (navigation.openDrawer !== undefined) {
            navigation.openDrawer();
        } else if (navigation.getParent() !== undefined && navigation.getParent().openDrawer !== undefined) {
            navigation.getParent().openDrawer();
        } else {
            console.error("cannot open drawer, unexpected location in navigation tree");
        }
    };

    const goBack = () => {
        if (options.onGoBack !== undefined) {
            const res = options.onGoBack();
            if (res instanceof Promise) {
                res.then(() => navigation.goBack()).catch((err) => console.log(err));
            } else {
                navigation.goBack();
            }
            return;
        } else {
            navigation.goBack();
        }
    };

    return (
        <Appbar.Header theme={{ colors: { primary: theme.colors.surface } }}>
            {back ? <Appbar.BackAction onPress={goBack} /> : <Appbar.Action icon="menu" onPress={openDrawer} />}
            {showTitle && <Appbar.Content title={title} />}
            {options.headerRight ? options.headerRight({}) : null}
        </Appbar.Header>
    );
};

export default Header;
