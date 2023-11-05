import { selectAccountBalances, selectAccountById, selectGroupCurrencySymbol } from "@abrechnung/redux";
import { TableCell } from "@mui/material";
import React from "react";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "../../store";
import { ShareSelect } from "../ShareSelect";

interface Props {
    groupId: number;
    accountId: number;
}

export const ClearingAccountDetail: React.FC<Props> = ({ groupId, accountId }) => {
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const currency_symbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));
    if (account.type !== "clearing") {
        throw new Error("expected a clearing account to render ClearingAccountDetail, but got a personal account");
    }

    return (
        <ShareSelect
            groupId={groupId}
            label="Participated"
            value={account.clearing_shares}
            additionalShareInfoHeader={
                <TableCell width="100px" align="right">
                    Shared
                </TableCell>
            }
            excludeAccounts={[account.id]}
            renderAdditionalShareInfo={({ account: participatingAccount }) => (
                <TableCell width="100px" align="right">
                    {(balances[account.id]?.clearingResolution[participatingAccount.id] ?? 0).toFixed(2)}{" "}
                    {currency_symbol}
                </TableCell>
            )}
            onChange={(value) => undefined}
            editable={false}
        />
    );
};

export default ClearingAccountDetail;
