import { Portal, Snackbar } from "react-native-paper";
import { useEffect, useState } from "react";
import NotificationTracker from "./core";

type notificationParams = {
    text: string;
    timeout?: number | null;
};

const DEFAULT_NOTIFICATION_PARAMS: notificationParams = {
    text: "",
    timeout: null,
};

const NOTIFICATION_KEY = "notification";

const notificationEmitter = new NotificationTracker();

export function notify(params: notificationParams) {
    notificationEmitter.notify(NOTIFICATION_KEY, {
        ...DEFAULT_NOTIFICATION_PARAMS,
        ...params,
    });
}

export function NotificationProvider() {
    const [state, setState] = useState({
        text: "",
        timeout: null,
        visible: false,
    });

    const onDismissSnackBar = () => {
        setState((prevState) => {
            return {
                ...prevState,
                visible: false,
            };
        });
    };

    useEffect(() => {
        return notificationEmitter.subscribe(NOTIFICATION_KEY, (event) => {
            console.log("received notification event", event);
            setState((prevState) => {
                return {
                    ...prevState,
                    ...event,
                    visible: true,
                };
            });
        });
    });

    return (
        <Portal>
            <Snackbar
                visible={state.visible}
                onDismiss={onDismissSnackBar}
                action={{
                    label: "Dismiss",
                    onPress: onDismissSnackBar,
                }}
            >
                {state.text}
            </Snackbar>
        </Portal>
    );
}
