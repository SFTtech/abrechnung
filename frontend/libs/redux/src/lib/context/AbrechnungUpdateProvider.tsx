import { AbrechnungWebSocket, Api, NotificationPayload } from "@abrechnung/api";
import { Subscription } from "../types";
import { useDispatch } from "react-redux";
import React from "react";
import { fetchAccount } from "../accounts";
import { fetchTransaction } from "../transactions";
import { AnyAction, ThunkDispatch } from "@reduxjs/toolkit";
import { IRootState } from "../types";
import { subscribe, unsubscribe } from "../subscriptions";
import { fetchGroups, fetchGroupInvites, fetchGroupLog, fetchGroupMembers } from "../groups";

export interface IAbrechnungUpdateProvider {
    api: Api;
    websocket: AbrechnungWebSocket;
    children: React.ReactElement;
}

export const useSubscription = (subscription: Subscription, websocket: AbrechnungWebSocket) => {
    const dispatch = useDispatch<ThunkDispatch<IRootState, undefined, AnyAction>>();

    React.useEffect(() => {
        dispatch(subscribe({ subscription, websocket }));

        return () => {
            dispatch(unsubscribe({ subscription, websocket }));
            return;
        };
    }, [dispatch, websocket, subscription]);
};

export const AbrechnungUpdateProvider: React.FC<IAbrechnungUpdateProvider> = ({ api, children, websocket }) => {
    const dispatch = useDispatch<ThunkDispatch<IRootState, undefined, AnyAction>>();

    React.useEffect(() => {
        const callback = (notificationPayload: NotificationPayload) => {
            switch (notificationPayload.type) {
                case "account":
                    dispatch(fetchAccount({ api, accountId: notificationPayload.accountId }));
                    break;
                case "transaction":
                    dispatch(fetchTransaction({ api, transactionId: notificationPayload.transactionId }));
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
