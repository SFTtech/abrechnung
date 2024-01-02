import { DrawerNavigationProp } from "@react-navigation/drawer";
import { HeaderTitleProps } from "@react-navigation/elements";
import { MaterialTopTabNavigationProp } from "@react-navigation/material-top-tabs";
import { Route } from "@react-navigation/native";
import { StackHeaderProps, StackNavigationProp } from "@react-navigation/stack";
import * as React from "react";
import { Appbar, Banner, useTheme } from "react-native-paper";
import { selectGlobalInfo, useAppSelector } from "../store";
import { GroupStackParamList, GroupTabParamList, RootDrawerParamList } from "./types";

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
        | MaterialTopTabNavigationProp<GroupTabParamList>
        | StackNavigationProp<GroupStackParamList>;
    route: Route<string>;
}

export const Header: React.FC<Props> = ({ navigation, route, options, back, ...props }) => {
    const theme = useTheme();
    const title =
        options.headerTitle !== undefined
            ? options.headerTitle
            : options.title !== undefined
              ? options.title
              : route.name;
    const showTitle = options.titleShown ?? true;
    const globalInfo = useAppSelector((state) => selectGlobalInfo({ state: state.ui }));

    const openDrawer = () => {
        if (navigation.openDrawer !== undefined) {
            navigation.openDrawer();
        } else if (navigation.getParent("Drawer") !== undefined) {
            navigation.getParent("Drawer").openDrawer();
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
        <>
            <Appbar.Header elevated={true}>
                {showTitle ? (
                    back ? (
                        <Appbar.BackAction onPress={goBack} />
                    ) : (
                        <Appbar.Action icon="menu" onPress={openDrawer} />
                    )
                ) : null}
                {showTitle && <Appbar.Content title={title} />}
                {options.headerRight ? options.headerRight({}) : null}
            </Appbar.Header>
            {globalInfo && (
                <Banner
                    visible={true}
                    icon="error"
                    style={{
                        backgroundColor: globalInfo.category === "error" ? theme.colors.errorContainer : undefined,
                    }}
                >
                    {globalInfo.text}
                </Banner>
            )}
        </>
    );
};

export default Header;
