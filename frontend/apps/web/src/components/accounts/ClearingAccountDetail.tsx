import { selectAccountBalances, selectGroupCurrencySymbol } from "@abrechnung/redux";
import { TableCell, Typography } from "@mui/material";
import React from "react";
import { selectGroupSlice, useAppSelector } from "@/store";
import { ShareSelect } from "../ShareSelect";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks";
import { ClearingAccount } from "@abrechnung/types";

interface Props {
    groupId: number;
    account: ClearingAccount;
}

export const ClearingAccountDetail: React.FC<Props> = ({ groupId, account }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const currency_symbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    if (!currency_symbol) {
        return null;
    }
    return (
        <>
            <Typography variant="h6">{t("accounts.clearingDistributionOf", "", { account })}</Typography>
            <ShareSelect
                groupId={groupId}
                label={t("accounts.participated")}
                value={account.clearing_shares}
                additionalShareInfoHeader={
                    <TableCell width="100px" align="right">
                        {t("common.shared")}
                    </TableCell>
                }
                excludeAccounts={[account.id]}
                renderAdditionalShareInfo={({ account: participatingAccount }) => (
                    <TableCell width="100px" align="right">
                        {formatCurrency(
                            balances[account.id]?.clearingResolution[participatingAccount.id] ?? 0,
                            currency_symbol
                        )}
                    </TableCell>
                )}
                editable={false}
            />
        </>
    );
};
