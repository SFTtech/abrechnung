import {
    fetchGroupLog,
    selectGroupLogStatus,
    selectGroupLogs,
    selectGroupMembers,
    subscribe,
    unsubscribe,
    useGroup,
} from "@abrechnung/redux";
import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React, { useEffect } from "react";
import { Loading } from "@abrechnung/components";
import { MobilePaper } from "@/components/style";
import { api, ws } from "@/core/api";
import { useTitle } from "@/core/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";

interface Props {
    groupId: number;
}

export const GroupActivity: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const group = useGroup(groupId);
    const members = useAppSelector((state) => selectGroupMembers(state, groupId));
    const logs = useAppSelector((state) => selectGroupLogs(state, groupId));
    const logLoadingStatus = useAppSelector((state) => selectGroupLogStatus(state, groupId));

    useTitle(t("groups.log.tabTitle", "", { groupName: group?.name }));

    useEffect(() => {
        dispatch(fetchGroupLog({ groupId, api }));
        dispatch(subscribe({ subscription: { type: "group_log", groupId }, websocket: ws }));
        return () => {
            dispatch(unsubscribe({ subscription: { type: "group_log", groupId }, websocket: ws }));
        };
    }, [dispatch, groupId]);

    const getMemberUsername = (member_id: number) => {
        const member = members.find((member) => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("groups.log.header")}
            </Typography>
            <List>
                {logLoadingStatus === undefined || logLoadingStatus === "loading" ? (
                    <Loading />
                ) : (
                    logs.map((logEntry) => (
                        <ListItem key={logEntry.id}>
                            <ListItemText
                                primary={`${logEntry.type} - ${logEntry.message}`}
                                secondary={t("groups.log.messageInfo", "", {
                                    username: getMemberUsername(logEntry.user_id),
                                    datetime: DateTime.fromISO(logEntry.logged_at).toLocaleString(
                                        DateTime.DATETIME_FULL
                                    ),
                                })}
                            />
                        </ListItem>
                    ))
                )}
            </List>
        </MobilePaper>
    );
};
