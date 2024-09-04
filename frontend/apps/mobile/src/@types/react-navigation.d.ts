import type { RootDrawerParamList } from "../navigation/types";
// import type { StackNavigationOptions as OriginalStackNavigationOptions } from "@react-navigation/stack";
// import type { DrawerNavigationOptions as OriginalDrawerNavigationOptions } from "@react-navigation/drawer";

declare global {
    namespace ReactNavigation {
        // eslint-disable-next-line @typescript-eslint/no-empty-interface
        interface RootParamList extends RootDrawerParamList {}

        // interface StackNavigationOptions extends OriginalStackNavigationOptions {
        //     onGoBack?: (() => void) | (() => Promise<void>);
        // }
        // interface DrawerNavigationOptions extends OriginalDrawerNavigationOptions {
        //     onGoBack?: (() => void) | (() => Promise<void>);
        // }
    }
}
