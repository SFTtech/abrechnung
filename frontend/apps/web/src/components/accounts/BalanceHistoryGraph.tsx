import { BalanceChangeOrigin } from "@abrechnung/core";
import {
    selectAccountBalanceHistory,
    selectAccountIdToNameMap,
    selectGroupCurrencySymbol,
    selectTransactionByIdMap,
} from "@abrechnung/redux";
import { fromISOString, toISODateString } from "@abrechnung/utils";
import { Box, Divider, Theme, Typography, useTheme } from "@mui/material";
import { PointMouseHandler, PointTooltipProps, ResponsiveLine, Serie } from "@nivo/line";
import { DateTime } from "luxon";
import React from "react";
import { useNavigate } from "react-router-dom";
import { balanceColor } from "../../core/utils";
import { selectAccountSlice, selectGroupSlice, selectTransactionSlice, useAppSelector } from "../../store";
import { ClearingAccountIcon, PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";

interface Props {
    groupId: number;
    accountId: number;
}

export const BalanceHistoryGraph: React.FC<Props> = ({ groupId, accountId }) => {
    const theme: Theme = useTheme();
    const balanceHistory = useAppSelector((state) => selectAccountBalanceHistory({ state, groupId, accountId }));
    const navigate = useNavigate();

    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const transactionMap = useAppSelector((state) =>
        selectTransactionByIdMap({ state: selectTransactionSlice(state), groupId })
    );
    const accountNameMap = useAppSelector((state) =>
        selectAccountIdToNameMap({ state: selectAccountSlice(state), groupId })
    );

    const graphData: Serie[] = [
        {
            id: "positive",
            data: balanceHistory.map((entry, index, arr) => {
                const prevEntry = index > 0 ? arr[index - 1] : null;
                const nextEntry = index < arr.length - 1 ? arr[index + 1] : null;
                return {
                    x: fromISOString(entry.date),
                    y:
                        entry.balance >= 0 ||
                        (prevEntry && prevEntry.balance >= 0) ||
                        (nextEntry && nextEntry.balance >= 0)
                            ? entry.balance
                            : null,
                    changeOrigin: entry.changeOrigin,
                };
            }),
        },
        {
            id: "negative",
            data: balanceHistory.map((entry) => {
                return {
                    x: fromISOString(entry.date),
                    y: entry.balance < 0 ? entry.balance : null,
                    changeOrigin: entry.changeOrigin,
                };
            }),
        },
    ];

    const onClick: PointMouseHandler = (point, event) => {
        const changeOrigin: BalanceChangeOrigin = (point.data as any).changeOrigin;
        if (changeOrigin.type === "clearing") {
            navigate(`/groups/${groupId}/accounts/${changeOrigin.id}`);
        } else {
            navigate(`/groups/${groupId}/transactions/${changeOrigin.id}`);
        }
    };

    const renderTooltip: React.FC<PointTooltipProps> = ({ point }) => {
        const changeOrigin: BalanceChangeOrigin = (point.data as any).changeOrigin;

        const icon =
            changeOrigin.type === "clearing" ? (
                <ClearingAccountIcon color="primary" sx={{ fontSize: theme.typography.fontSize }} />
            ) : transactionMap[changeOrigin.id].type === "purchase" ? (
                <PurchaseIcon color="primary" sx={{ fontSize: theme.typography.fontSize }} />
            ) : (
                <TransferIcon color="primary" sx={{ fontSize: theme.typography.fontSize }} />
            );

        return (
            <Box
                sx={{
                    backgroundColor: theme.palette.background.paper,
                    borderColor: theme.palette.divider,
                    borderRadius: theme.shape.borderRadius,
                    borderWidth: "1px",
                    borderStyle: "solid",
                    padding: 2,
                }}
            >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <Typography variant="body1" component="span">
                        {DateTime.fromJSDate(point.data.x as Date).toISODate()}
                    </Typography>
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) => balanceColor(point.data.y as number, theme),
                            ml: 2,
                        }}
                    >
                        {(point.data.y as number).toFixed(2)} {currencySymbol}
                    </Typography>
                </div>
                <Divider />
                {changeOrigin.type === "clearing" ? (
                    <Typography variant="body1">
                        {icon} {accountNameMap[changeOrigin.id]}
                    </Typography>
                ) : (
                    <Typography variant="body1">
                        {icon} {transactionMap[changeOrigin.id].name}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveLine
                data={graphData}
                margin={{ top: 50, right: 50, bottom: 50, left: 60 }}
                xScale={{ type: "time", precision: "day", format: "native" }}
                yScale={{ type: "linear", min: "auto", max: "auto" }}
                colors={[theme.palette.success.main, theme.palette.error.main]}
                tooltip={renderTooltip}
                onClick={onClick}
                pointLabel={(p) => `${toISODateString(p.x as Date)}: ${p.y}`}
                useMesh={true}
                yFormat=">-.2f"
                axisLeft={{
                    format: (value: number) => `${value.toFixed(2)} ${currencySymbol}`,
                }}
                axisBottom={{
                    tickValues: 4,
                    format: (value: Date) => toISODateString(value),
                }}
                enableArea={true}
                areaOpacity={0.07}
            />
        </div>
    );
};

export default BalanceHistoryGraph;
