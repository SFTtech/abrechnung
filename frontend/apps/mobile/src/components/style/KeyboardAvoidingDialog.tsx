import React from "react";
import { Dialog } from "react-native-paper";
import { Platform, Keyboard, KeyboardEvent, Dimensions } from "react-native";

type Props = React.ComponentProps<typeof Dialog>;

interface State {
    bottom: number;
    maxHeight: number;
}

export const KeyboardAvoidingDialog: React.FC<Props> = (props) => {
    const [state, setState] = React.useState<State>({
        bottom: 0,
        maxHeight: Dimensions.get("window").height,
    });

    React.useEffect(() => {
        const onKeyboardChange = (e: KeyboardEvent) => {
            setState({
                bottom: e.endCoordinates.height / 2,
                maxHeight: e.endCoordinates.screenY - 50,
            });
            // console.log(
            //     "\nbottom padding",
            //     e.endCoordinates.height / 2,
            //     "\nkeyboard screen height",
            //     e.endCoordinates.screenY,
            //     "\nwindow height",
            //     Dimensions.get("window").height,
            //     "\nscreen height",
            //     Dimensions.get("screen").height
            // );
        };

        if (Platform.OS === "ios") {
            const subscription = Keyboard.addListener("keyboardWillChangeFrame", onKeyboardChange);
            return () => subscription.remove();
        }

        const subscriptions = [
            Keyboard.addListener("keyboardDidHide", onKeyboardChange),
            Keyboard.addListener("keyboardDidShow", onKeyboardChange),
        ];
        return () => subscriptions.forEach((subscription) => subscription.remove());
    }, []);

    return <Dialog style={{ bottom: state.bottom, top: 0, maxHeight: state.maxHeight }} {...props} />;
};
