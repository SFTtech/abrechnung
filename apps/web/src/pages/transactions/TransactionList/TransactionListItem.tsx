import { ListItemLink } from "@/components/style/ListItemLink";
import { useFormatCurrency, useFormatDatetime } from "@/hooks";
import { useAppSelector } from "@/store";
import { selectTransactionBalanceEffect, useGroupCurrencyIdentifier, useTransaction } from "@abrechnung/redux";
import { Chip, Divider, ListItemAvatar, ListItemText, Stack, Typography } from "@mui/material";
import * as React from "react";
import { balanceColor } from "@/core/utils";
import { useTranslation } from "react-i18next";
import { TransactionIcon, TransactionPaidBy } from "@/components";

interface Props {
    groupId: number;
    transactionId: number;
    ownedAccountId: number | null;
    style?: React.CSSProperties;
}

export const TransactionListItem: React.FC<Props> = ({ groupId, ownedAccountId, transactionId, style }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const transaction = useTransaction(groupId, transactionId);
    const balanceEffect = useAppSelector((state) => selectTransactionBalanceEffect(state, groupId, transactionId));
    const groupCurrencyIdentifier = useGroupCurrencyIdentifier(groupId);
    const formatDatetime = useFormatDatetime();
    if (transaction === undefined || groupCurrencyIdentifier === undefined) {
        // TODO: HACKY WORKAROUND
        // when switching between groups which are already loaded into the redux store we will land on the transaction list page
        // if we switch from group 1 > transactions to group 2 > transactions the transaction list component will not get unmounted
        // and the group id will be updated before it receives the new transaction list from the redux store -> the list entries will
        // get the new group id with the old transaction id => the transaction will be undefined as it does not exist in the new group
        //
        // a possible solution would be to track the currently active group in the redux store as well and not pass it to the selectors
        // and components, unsure if this would work properly though. Additionally it leaves us with less flexibility when reusing
        // selectors as they will always work on the currently active group.
        return null;
    }

    const ownAccountBalanceEffect = ownedAccountId != null ? balanceEffect[ownedAccountId] : undefined;

    const valueInGroupCurrency = (() => {
        if (groupCurrencyIdentifier === transaction.currency_identifier) {
            return undefined;
        }

        return transaction.value * transaction.currency_conversion_rate;
    })();

    return (
        <>
            <ListItemLink to={`/groups/${groupId}/transactions/${transactionId}`} style={style}>
                <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                    <TransactionIcon type={transaction.type} />
                </ListItemAvatar>
                <ListItemText
                    slotProps={{
                        primary: {
                            component: "div",
                        },
                        secondary: {
                            component: "div",
                        },
                    }}
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
                                {transaction.tags.map((t) => (
                                    <Chip
                                        key={t}
                                        sx={{ ml: 1 }}
                                        variant="outlined"
                                        size="small"
                                        color="info"
                                        label={t}
                                    />
                                ))}
                            </div>
                            {ownAccountBalanceEffect != null && (
                                <div>
                                    <span>{t("transactions.yourBalance")}&nbsp;</span>
                                    <Typography
                                        variant="body2"
                                        component="span"
                                        sx={{
                                            color: (theme) => balanceColor(ownAccountBalanceEffect.total, theme),
                                        }}
                                    >
                                        {formatCurrency(ownAccountBalanceEffect.total, transaction.currency_identifier)}
                                    </Typography>
                                </div>
                            )}
                        </Stack>
                    }
                />

                <ListItemText>
                    <Typography align="right" variant="body2">
                        {formatCurrency(transaction.value, transaction.currency_identifier)}
                        {valueInGroupCurrency != null && (
                            <>
                                &#32;&#40;
                                {formatCurrency(valueInGroupCurrency, groupCurrencyIdentifier)}
                                &#41;
                            </>
                        )}
                        <br />
                        <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                            {formatDatetime(transaction.billed_at, "date")}
                        </Typography>
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
