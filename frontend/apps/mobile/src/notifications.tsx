import React from "react";
import { Portal, Snackbar } from "react-native-paper";
import { useEffect, useState } from "react";
import { EventEmitter } from "@abrechnung/utils";

interface NotificationPayload {
    text: string;
    timeout?: number | undefined;
}

const DEFAULT_NOTIFICATION_PARAMS: NotificationPayload = {
    text: "",
    timeout: undefined,
};

const notificationEmitter = new EventEmitter<NotificationPayload>();

export function notify(params: NotificationPayload) {
    notificationEmitter.emit({
        ...DEFAULT_NOTIFICATION_PARAMS,
        ...params,
    });
}

export const NotificationProvider: React.FC = () => {
    const [state, setState] = useState<NotificationPayload & { visible: boolean }>({
        text: "",
        timeout: undefined,
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
        const callback = (event: NotificationPayload) => {
            console.log("received notification event", event);
            setState((prevState) => {
                return {
                    ...prevState,
                    ...event,
                    visible: true,
                };
            });
        };
        notificationEmitter.addListener(callback);
        return () => notificationEmitter.removeAllListeners();
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
};

export default NotificationProvider;
