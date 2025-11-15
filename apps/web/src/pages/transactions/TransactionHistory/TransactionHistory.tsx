import { MobilePaper } from "@/components/style";
import {
    TransactionHistory as ApiTransactionHistory,
    useGetTransactionHistoryQuery,
    useListMembersQuery,
} from "@/core/generated/api";
import { useFormatDatetime } from "@/hooks";
import { Loading } from "@abrechnung/components";
import { useTransaction } from "@abrechnung/redux";
import { Transaction } from "@abrechnung/types";
import { ChevronLeft } from "@mui/icons-material";
import {
    Timeline,
    TimelineConnector,
    TimelineContent,
    TimelineDot,
    TimelineItem,
    TimelineOppositeContent,
    TimelineSeparator,
} from "@mui/lab";
import { Chip, IconButton, Stack, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router";

type TransactionHistoryProps = {
    groupId: number;
};

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({ groupId }) => {
    const { t } = useTranslation();
    const params = useParams();
    const transactionId = Number(params["id"]);
    const formatDatetime = useFormatDatetime();
    const navigate = useNavigate();
    const transaction: Transaction | undefined = useTransaction(groupId, transactionId);
    const { data: history } = useGetTransactionHistoryQuery({ groupId, transactionId });
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

    if (!transaction) {
        return <Navigate to="/404" />;
    }

    if (!members || !history) {
        return <Loading />;
    }

    const navigateBack = () => {
        navigate(-1);
    };

    const getHistoryMessage = (hist: ApiTransactionHistory, index: number) => {
        const username = members[hist.changed_by]?.username;
        if (index === 0) {
            return t("common.createdBy", { username });
        }

        return t("common.changedBy", { username });
    };
    return (
        <MobilePaper>
            <Stack direction="row" spacing={1} alignItems="center">
                <IconButton sx={{ display: { xs: "none", md: "inline-flex" } }} onClick={navigateBack}>
                    <ChevronLeft />
                </IconButton>
                <Chip color="primary" label={t(`transactions.type.${transaction.type}`)} />
                <Typography>{transaction.name}</Typography>
            </Stack>
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
        </MobilePaper>
    );
};
