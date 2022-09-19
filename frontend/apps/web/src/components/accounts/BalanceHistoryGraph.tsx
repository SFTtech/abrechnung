import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useNavigate } from "react-router-dom";
import { DateTime } from "luxon";
import { useRecoilValue } from "recoil";
import { accountBalanceHistory, transactionByIDMap } from "../../state/transactions";
import { Box, Divider, Theme, Typography, useTheme } from "@mui/material";
import { accountByIDMap } from "../../state/accounts";
import { ClearingAccountIcon, PurchaseIcon, TransferIcon } from "../style/AbrechnungIcons";
import { balanceColor } from "../../core/utils";
import React from "react";

export default function BalanceHistoryGraph({ group, accountID }) {
    const theme: Theme = useTheme();
    const balanceHistory = useRecoilValue(accountBalanceHistory({ groupID: group.id, accountID: accountID }));
    const navigate = useNavigate();

    const transactionMap = useRecoilValue(transactionByIDMap(group.id));
    const accountMap = useRecoilValue(accountByIDMap(group.id));

    const onClick = (evt) => {
        if (evt.activePayload.length > 0) {
            const payload = evt.activePayload[0].payload;
            if (payload.changeOrigin.type === "clearing") {
                navigate(`/groups/${group.id}/accounts/${payload.changeOrigin.id}`);
            } else {
                navigate(`/groups/${group.id}/transactions/${payload.changeOrigin.id}`);
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
                        {payload[0].value} {group.currency_symbol}
                    </Typography>
                </div>
                <Divider />
                {payload[0].payload.changeOrigin.type === "clearing" ? (
                    <Typography variant="body1">{accountMap[payload[0].payload.changeOrigin.id].name}</Typography>
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
                    unit={group.currency_symbol}
                    stroke={theme.palette.text.primary}
                />
                <Tooltip content={renderTooltip} />
                <Legend />
                <Line type="stepAfter" dataKey="balance" />
            </LineChart>
        </ResponsiveContainer>
    );
}
