import { useGroup } from "@abrechnung/redux";
import { Divider, List, ListItem, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { Loading } from "@abrechnung/components";
import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useTranslation } from "react-i18next";
import { useFormatDatetime } from "@/hooks";
import { useListLogQuery, useListMembersQuery } from "@/core/generated/api";

interface Props {
    groupId: number;
}

export const GroupActivity: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const group = useGroup(groupId);
    const formatDatetime = useFormatDatetime();
    const { data: members } = useListMembersQuery({ groupId });
    const { data: logs } = useListLogQuery({ groupId });

    useTitle(t("groups.log.tabTitle", { groupName: group?.name }));

    const getMemberUsername = (member_id: number) => {
        const foundMember = members?.find((member) => member.user_id === member_id);
        if (foundMember === undefined) {
            return "unknown";
        }
        return foundMember.username;
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("groups.log.header")}
            </Typography>
            <List>
                {logs == null ? (
                    <Loading />
                ) : (
                    logs.map((logEntry) => (
                        <div key={logEntry.id}>
                            <ListItem>
                                <ListItemText
                                    primary={`${logEntry.type} - ${logEntry.message}`}
                                    secondary={t("groups.log.messageInfo", {
                                        username: getMemberUsername(logEntry.user_id),
                                        datetime: formatDatetime(logEntry.logged_at, "full"),
                                    })}
                                />
                            </ListItem>
                            <Divider sx={{ display: { lg: "none" } }} component="li" />
                        </div>
                    ))
                )}
            </List>
        </MobilePaper>
    );
};
