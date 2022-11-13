import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { Box, Divider, Theme, Typography, useTheme } from "@mui/material";
import { ClearingAccountIcon, PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";
import { balanceColor } from "../../core/utils";
import React from "react";
import { selectAccountSlice, selectGroupSlice, selectTransactionSlice, useAppSelector } from "../../store";
import {
    selectAccountIdToNameMap,
    selectGroupCurrencySymbol,
    selectAccountBalanceHistory,
    selectTransactionByIdMap,
} from "@abrechnung/redux";

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
    const accountMap = useAppSelector((state) =>
        selectAccountIdToNameMap({ state: selectAccountSlice(state), groupId })
    );

    const onClick = (evt) => {
        if (evt.activePayload.length > 0) {
            const payload = evt.activePayload[0].payload;
            if (payload.changeOrigin.type === "clearing") {
                navigate(`/groups/${groupId}/accounts/${payload.changeOrigin.id}`);
            } else {
                navigate(`/groups/${groupId}/transactions/${payload.changeOrigin.id}`);
            }
        }
    };

    const renderTooltip = ({ payload, label, active }) => {
        if (!active) {
            return null;
        }

        const changeOrigin = payload[0].payload.changeOrigin;

        const icon =
            changeOrigin.type === "clearing" ? (
                <ClearingAccountIcon color="primary" fontSize="small" />
            ) : transactionMap[changeOrigin.id].type === "purchase" ? (
                <PurchaseIcon color="primary" sx={{ fontSize: theme.typography.fontSize }} />
            ) : (
                <TransferIcon color="primary" fontSize="small" />
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
                        {DateTime.fromSeconds(payload[0].payload.date).toISODate()} {icon}
                    </Typography>
                    <Typography
                        component="span"
                        sx={{
                            color: (theme) => balanceColor(payload[0].value, theme),
                            ml: 2,
                        }}
                    >
                        {payload[0].value} {currencySymbol}
                    </Typography>
                </div>
                <Divider />
                {payload[0].payload.changeOrigin.type === "clearing" ? (
                    <Typography variant="body1">{accountMap[payload[0].payload.changeOrigin.id]}</Typography>
                ) : (
                    <Typography variant="body1">
                        {transactionMap[payload[0].payload.changeOrigin.id].description}
                    </Typography>
                )}
            </Box>
        );
    };

    return (
        <ResponsiveContainer width="100%" height={300}>
            <LineChart
                width={730}
                height={250}
                onClick={onClick}
                data={balanceHistory}
                margin={{
                    top: 5,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                    dataKey="date"
                    stroke={theme.palette.text.primary}
                    type="number"
                    tickFormatter={(unixTime) => DateTime.fromSeconds(unixTime).toISODate()}
                    domain={["dataMin", "dataMax"]}
                />
                <YAxis
                    tickFormatter={(value) => value.toFixed(2)}
                    type="number"
                    unit={currencySymbol}
                    stroke={theme.palette.text.primary}
                />
                <Tooltip content={renderTooltip} />
                <Legend />
                <Line type="stepAfter" dataKey="balance" />
            </LineChart>
        </ResponsiveContainer>
    );
};

export default BalanceHistoryGraph;
