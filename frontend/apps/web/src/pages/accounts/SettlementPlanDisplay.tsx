import { MobilePaper } from "@/components/style/mobile";
import { selectAccountSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import { SettlementPlanItem } from "@abrechnung/core";
import {
    createTransaction,
    selectAccountIdToAccountMap,
    selectGroupCurrencySymbol,
    selectSettlementPlan,
} from "@abrechnung/redux";
import { Button, List, ListItem, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks";

interface Props {
    groupId: number;
}

export const SettlementPlanDisplay: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const settlementPlan = useAppSelector((state) => selectSettlementPlan({ state, groupId }));
    const currency_symbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const accountMap = useAppSelector((state) =>
        selectAccountIdToAccountMap({ state: selectAccountSlice(state), groupId })
    );

    const onSettleClicked = (planItem: SettlementPlanItem) => {
        dispatch(
            createTransaction({
                type: "transfer",
                groupId,
                data: {
                    name: t("accounts.settlement.transactionName"),
                    value: planItem.paymentAmount,
                    creditor_shares: { [planItem.creditorId]: 1 },
                    debitor_shares: { [planItem.debitorId]: 1 },
                },
            })
        )
            .unwrap()
            .then(({ transaction }) => {
                navigate(`/groups/${groupId}/transactions/${transaction.id}?no-redirect=true`);
            });
    };

    return (
        <MobilePaper>
            <Typography variant="h5">{t("accounts.settlement.title")}</Typography>
            <List>
                {settlementPlan.map((planItem) => (
                    <ListItem key={`${planItem.creditorId}-${planItem.debitorId}`}>
                        <ListItemText
                            primary={
                                <span>
                                    {t("accounts.settlement.whoPaysWhom", "", {
                                        from: accountMap[planItem.creditorId].name,
                                        to: accountMap[planItem.debitorId].name,
                                        money: formatCurrency(planItem.paymentAmount, currency_symbol),
                                    })}
                                </span>
                            }
                        />
                        <ListItemSecondaryAction>
                            <Button onClick={() => onSettleClicked(planItem)}>
                                {t("accounts.settlement.settleButton")}
                            </Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </MobilePaper>
    );
};
