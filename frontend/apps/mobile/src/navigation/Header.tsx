import { Appbar, useTheme } from "react-native-paper";
import * as React from "react";
import { StackHeaderProps } from "@react-navigation/stack";

export default function Header({ navigation, route, options, back }: StackHeaderProps) {
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
}
