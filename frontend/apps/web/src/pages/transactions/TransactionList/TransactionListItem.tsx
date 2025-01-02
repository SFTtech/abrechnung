import { PurchaseIcon, TransferIcon } from "@/components/style/AbrechnungIcons";
import { ListItemLink } from "@/components/style/ListItemLink";
import { useFormatCurrency, useIsSmallScreen } from "@/hooks";
import { useAppSelector } from "@/store";
import { selectAccountIdToAccountMap, useTransaction } from "@abrechnung/redux";
import { HelpOutline } from "@mui/icons-material";
import { Chip, Divider, ListItemAvatar, ListItemText, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

interface Props {
    groupId: number;
    transactionId: number;
    style?: React.CSSProperties;
}

export const TransactionListItem: React.FC<Props> = ({ groupId, transactionId, style }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const accounts = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));
    const transaction = useTransaction(groupId, transactionId);
    const isSmallScreen = useIsSmallScreen();
    if (transaction === undefined) {
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

    const creditorNames = Object.keys(transaction.creditor_shares)
        .map((accountId) => accounts[Number(accountId)]?.name)
        .join(", ");
    const debitorNames = Object.keys(transaction.debitor_shares)
        .map((accountId) => accounts[Number(accountId)]?.name)
        .join(", ");

    return (
        <>
            <ListItemLink to={`/groups/${groupId}/transactions/${transactionId}`} style={style}>
                <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                    {transaction.type === "purchase" ? (
                        <Tooltip title={t("transactions.purchase")}>
                            <PurchaseIcon color="primary" />
                        </Tooltip>
                    ) : transaction.type === "transfer" ? (
                        <Tooltip title={t("transactions.transfer")}>
                            <TransferIcon color="primary" />
                        </Tooltip>
                    ) : (
                        <Tooltip title="Unknown Transaction Type">
                            <HelpOutline color="primary" />
                        </Tooltip>
                    )}
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
                        <>
                            <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                {t("transactions.byFor", "", { by: creditorNames, for: debitorNames })}
                            </Typography>
                            <br />
                            {DateTime.fromISO(transaction.billed_at).toLocaleString(DateTime.DATE_FULL)}
                            {transaction.tags.map((t) => (
                                <Chip key={t} sx={{ ml: 1 }} variant="outlined" size="small" color="info" label={t} />
                            ))}
                        </>
                    }
                />
                <ListItemText>
                    <Typography align="right" variant="body2">
                        {formatCurrency(transaction.value, transaction.currency_symbol)}
                        {!isSmallScreen && (
                            <>
                                <br />
                                <Typography component="span" sx={{ typography: "body2", color: "text.secondary" }}>
                                    {t("common.lastChangedWithTime", "", {
                                        datetime: DateTime.fromISO(transaction.last_changed).toLocaleString(
                                            DateTime.DATETIME_FULL
                                        ),
                                    })}
                                </Typography>
                            </>
                        )}
                    </Typography>
                </ListItemText>
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
