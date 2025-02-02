import {
    TransactionHistory as ApiTransactionHistory,
    useGetTransactionHistoryQuery,
    useListMembersQuery,
} from "@/core/generated/api";
import { useFormatDatetime } from "@/hooks";
import { Loading } from "@abrechnung/components";
import { Transaction } from "@abrechnung/types";
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineItem,
    TimelineOppositeContent,
    TimelineSeparator,
} from "@mui/lab";
import { Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

type TransactionHistoryProps = {
    groupId: number;
    transaction: Transaction;
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ groupId, transaction }) => {
    const { t } = useTranslation();
    const formatDatetime = useFormatDatetime();
    const { data: history } = useGetTransactionHistoryQuery({ groupId, transactionId: transaction.id });
    const { members } = useListMembersQuery(
        { groupId },
        {
            selectFromResult: ({ data }) => {
                if (!data) {
                    return { members: undefined };
                }
                return { members: Object.fromEntries(data.map((member) => [member.user_id, member])) };
            },
        }
    );

    if (!members || !history) {
        return <Loading />;
    }

    const getHistoryMessage = (hist: ApiTransactionHistory, index: number) => {
        const username = members[hist.changed_by]?.username;
        if (index === 0) {
            return t("common.createdBy", { username });
        }

        return t("common.changedBy", { username });
    };
    return (
        <Timeline>
            {history.map((hist, index) => (
                <TimelineItem key={hist.revision_id}>
                    <TimelineOppositeContent
                        sx={{ m: "auto 0", width: "100px" }}
                        align="right"
                        variant="body2"
                        color="text.secondary"
                    >
                        {formatDatetime(hist.changed_at, "date-short")}
                    </TimelineOppositeContent>
                    <TimelineSeparator>
                        <TimelineDot />
                        <TimelineConnector />
                    </TimelineSeparator>
                    <TimelineContent>
                        <Typography>{getHistoryMessage(hist, index)}</Typography>
                    </TimelineContent>
                </TimelineItem>
            ))}
        </Timeline>
    );
};
