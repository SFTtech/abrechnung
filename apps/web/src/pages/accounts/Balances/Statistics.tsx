import { Group } from "@/core/generated/api";
import { useFormatCurrency } from "@/hooks";
import { useAppSelector } from "@/store";
import { Help } from "@abrechnung/components";
import { selectAccountBalances } from "@abrechnung/redux";
import { Alert, AlertTitle, Box, Link, Stack, Typography } from "@mui/material";
import * as React from "react";
import { Trans, useTranslation } from "react-i18next";
import { Link as RouterLink } from "react-router";

export type StatisticsProps = {
    group: Group;
};

export const Statistics: React.FC<StatisticsProps> = ({ group }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();

    const balances = useAppSelector((state) => selectAccountBalances(state, group.id));

    const personalBalance = group.owned_account_id != null ? balances[group.owned_account_id] : undefined;

    const totalSpendings = React.useMemo(() => {
        return Object.values(balances).reduce(
            (totalSpendings, balance) => totalSpendings + balance.totalConsumedPurchases,
            0
        );
    }, []);

    return (
        <Stack direction="column" spacing={1}>
            <Box>
                <Typography color="textSecondary" sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                    {t("accounts.balances.totalGroupExpenses")}
                    <Help title={t("accounts.balances.totalGroupExpensesHelp")} />
                </Typography>
                <Typography fontSize={20}>{formatCurrency(totalSpendings, group.currency_identifier)}</Typography>
            </Box>

            {personalBalance != null ? (
                <>
                    <Box>
                        <Typography color="textSecondary" sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                            {t("accounts.balances.yourTotalDisbursements")}
                            <Help title={t("accounts.balances.yourTotalDisbursementsHelp")} />
                        </Typography>
                        <Typography fontSize={20}>
                            {formatCurrency(personalBalance.totalPaidPurchases, group.currency_identifier)}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography color="textSecondary" sx={{ display: "flex", alignItems: "flex-end", gap: 1 }}>
                            {t("accounts.balances.yourTotalExpenses")}
                            <Help title={t("accounts.balances.yourTotalExpenses")} />
                        </Typography>
                        <Typography fontSize={20}>
                            {formatCurrency(personalBalance.totalConsumedPurchases, group.currency_identifier)}
                        </Typography>
                    </Box>
                </>
            ) : (
                <Alert severity="info">
                    <AlertTitle>{t("accounts.balances.noOwnedAccountAlertTitle")}</AlertTitle>
                    <Trans key="accounts.balances.noOwnedAccountAlertBody">
                        Head over to the{" "}
                        <Link component={RouterLink} to={`/groups/${group.id}/detail`}>
                            group settings
                        </Link>{" "}
                        to claim an account and have individualized statistics shown here.
                    </Trans>
                </Alert>
            )}
        </Stack>
    );
};
