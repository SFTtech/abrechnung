import { AbrechnungWebSocket, Api, NotificationPayload } from "@abrechnung/api";
import { UnknownAction, ThunkDispatch } from "@reduxjs/toolkit";
import React from "react";
import { useDispatch } from "react-redux";
import { fetchAccount } from "../accounts";
import { fetchGroupInvites, fetchGroupLog, fetchGroupMembers, fetchGroups } from "../groups";
import { subscribe, unsubscribe } from "../subscriptions";
import { fetchTransaction } from "../transactions";
import { IRootState, Subscription } from "../types";

export interface IAbrechnungUpdateProvider {
    api?: Api;
    websocket?: AbrechnungWebSocket;
    children: React.ReactElement;
}

export const useSubscription = (subscription: Subscription, websocket: AbrechnungWebSocket) => {
    const dispatch = useDispatch<ThunkDispatch<IRootState, undefined, UnknownAction>>();

    React.useEffect(() => {
        dispatch(subscribe({ subscription, websocket }));

        return () => {
            dispatch(unsubscribe({ subscription, websocket }));
            return;
        };
    }, [dispatch, websocket, subscription]);
};

export const AbrechnungUpdateProvider: React.FC<IAbrechnungUpdateProvider> = ({ api, children, websocket }) => {
    const dispatch = useDispatch<ThunkDispatch<IRootState, undefined, UnknownAction>>();

    React.useEffect(() => {
        if (!api || !websocket) {
            return () => undefined;
        }
        const callback = (notificationPayload: NotificationPayload) => {
            switch (notificationPayload.type) {
                case "account":
                    dispatch(
                        fetchAccount({
                            api,
                            groupId: notificationPayload.groupId,
                            accountId: notificationPayload.accountId,
                        })
                    );
                    break;
                case "transaction":
                    dispatch(
                        fetchTransaction({
                            api,
                            groupId: notificationPayload.groupId,
                            transactionId: notificationPayload.transactionId,
                        })
                    );
                    break;
                case "group":
                    dispatch(fetchGroups({ api }));
                    break;
                case "group_member":
                    dispatch(fetchGroupMembers({ api, groupId: notificationPayload.groupId }));
                    break;
                case "group_invite":
                    dispatch(fetchGroupInvites({ api, groupId: notificationPayload.groupId }));
                    break;
                case "group_log":
                    dispatch(fetchGroupLog({ api, groupId: notificationPayload.groupId }));
                    break;
            }
        };

        websocket.addBareNotificationHandler(callback);
        return () => websocket.removeBareNotificationHandler(callback);
    }, [dispatch, websocket, api]);

    return children;
};
