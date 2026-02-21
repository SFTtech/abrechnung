import { useFormatCurrency } from "@/hooks";
import { useAppSelector } from "@/store";
import { Group } from "@abrechnung/api";
import { selectAccountBalances, useSortedAccounts } from "@abrechnung/redux";
import { Box, Chip, Theme, Typography } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";

export type BalanceBarGraphProps = {
    group: Group;
};

type Data = {
    name: string;
    id: number;
    balance: number;
    isYou: boolean;
};

export const BalanceBarGraph: React.FC<BalanceBarGraphProps> = ({ group }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const theme: Theme = useTheme();
    const navigate = useNavigate();

    const personalAccounts = useSortedAccounts(group.id, {
        sortMode: "name",
        type: "personal",
        excludeLocalOnly: true,
    });
    const balances = useAppSelector((state) => selectAccountBalances(state, group.id));

    const colorGreen = theme.palette.mode === "light" ? theme.palette.success.light : theme.palette.success.dark;
    const colorRed = theme.palette.mode === "light" ? theme.palette.error.light : theme.palette.error.dark;

    const roundTwoDecimals = (val: number) => +val.toFixed(2);

    const chartData: Data[] = personalAccounts.map((account) => {
        const balance = balances[account.id];
        return {
            id: account.id,
            name: account.name,
            isYou: group.owned_account_id === account.id,
            balance: roundTwoDecimals(balance?.balance ?? 0),
        };
    });

    // Calculate min and max for scaling
    const maxBalance = Math.max(...chartData.map((d) => d.balance), 0);

    const handleBarClick = (accountId: number) => {
        navigate(`/groups/${group.id}/accounts/${accountId}`);
    };

    const itsYouChip = (
        <Chip sx={{ ml: 1 }} size="small" component="span" color="primary" label={t("groups.memberList.itsYou")} />
    );

    return (
        <Box sx={{ display: "grid", gridTemplateColumns: "1fr", gridAutoRows: "32px", rowGap: 1 }}>
            {chartData.map((item, index) => {
                const isPositive = item.balance >= 0;
                const widthPercentage = Math.abs(item.balance / maxBalance) * 100;

                return (
                    <Box
                        key={index}
                        sx={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            cursor: "pointer",
                            "&:hover": {
                                backgroundColor: theme.palette.action.hover,
                            },
                        }}
                        onClick={() => handleBarClick(item.id)}
                    >
                        {/* Left Section: Negative Bars & Positive Labels */}
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                justifyContent: "flex-end",
                                alignItems: "center",
                            }}
                        >
                            {isPositive ? (
                                <Typography variant="body2" sx={{ mr: 1 }}>
                                    {item.name}
                                    {item.isYou && itsYouChip}
                                </Typography>
                            ) : (
                                <>
                                    <Typography variant="body2" sx={{ mr: 1, textWrap: "nowrap" }}>
                                        {formatCurrency(item.balance, group.currency_identifier)}
                                    </Typography>
                                    <Box
                                        sx={{
                                            height: "100%",
                                            width: `${widthPercentage}%`,
                                            borderWidth: "1px",
                                            borderStyle: "solid",
                                            borderColor: colorRed,
                                            backgroundColor: colorRed,
                                            borderRight: 0,
                                            borderRadius: "8px 0 0 8px",
                                        }}
                                    ></Box>
                                </>
                            )}
                        </Box>

                        {/* Right Section: Positive Bars & Negative Labels */}
                        <Box
                            sx={{
                                flex: 1,
                                display: "flex",
                                justifyContent: "flex-start",
                                alignItems: "center",
                            }}
                        >
                            {isPositive ? (
                                <>
                                    <Box
                                        sx={{
                                            height: "100%",
                                            width: `${widthPercentage}%`,
                                            borderWidth: "1px",
                                            borderStyle: "solid",
                                            borderColor: colorGreen,
                                            backgroundColor: colorGreen,
                                            borderLeft: 0,
                                            borderRadius: "0 8px 8px 0",
                                        }}
                                    />
                                    <Typography variant="body2" sx={{ ml: 1, textWrap: "nowrap" }}>
                                        {formatCurrency(item.balance, group.currency_identifier)}
                                    </Typography>
                                </>
                            ) : (
                                <Typography variant="body2" sx={{ ml: 1 }}>
                                    {item.name}
                                    {item.isYou && itsYouChip}
                                </Typography>
                            )}
                        </Box>
                    </Box>
                );
            })}
        </Box>
    );
};
