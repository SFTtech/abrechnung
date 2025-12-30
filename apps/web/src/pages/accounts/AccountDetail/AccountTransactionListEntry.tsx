import { selectTransactionBalanceEffect, useGroupCurrencyIdentifier } from "@abrechnung/redux";
import { Chip, Divider, ListItemAvatar, ListItemText, Stack, Typography } from "@mui/material";
import * as React from "react";
import { balanceColor } from "@/core/utils";
import { useAppSelector } from "@/store";
import { ListItemLink } from "@/components/style";
import { Transaction } from "@abrechnung/types";
import { useFormatCurrency, useFormatDatetime } from "@/hooks";
import { TransactionIcon, TransactionPaidBy } from "@/components";

interface Props {
    groupId: number;
    transaction: Transaction;
    accountId: number;
}

export const AccountTransactionListEntry: React.FC<Props> = ({ groupId, transaction, accountId }) => {
    const balanceEffect = useAppSelector((state) => selectTransactionBalanceEffect(state, groupId, transaction.id));
    const formatDatetime = useFormatDatetime();
    const formatCurrency = useFormatCurrency();
    const currencyIdentifier = useGroupCurrencyIdentifier(groupId);

    return (
        <>
            <ListItemLink to={`/groups/${groupId}/transactions/${transaction.id}`}>
                <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                    <TransactionIcon type={transaction.type} />
                </ListItemAvatar>
                <ListItemText
                    primary={
                        <>
                            {transaction.is_wip && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body1" component="span">
                                {transaction.name}
                            </Typography>
                        </>
                    }
                    secondary={
                        <Stack>
                            <div>
                                <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                    <TransactionPaidBy groupId={groupId} transaction={transaction} />
                                </Typography>
                            </div>
                            <div>
                                <span>{formatDatetime(transaction.billed_at, "date")}</span>
                            </div>
                        </Stack>
                    }
                />
                <ListItemText>
                    <Typography align="right" variant="body2">
                        <Typography
                            component="span"
                            sx={{
                                color: (theme) => balanceColor(balanceEffect[accountId].total, theme),
                            }}
                        >
                            {formatCurrency(balanceEffect[accountId].total, currencyIdentifier)}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
