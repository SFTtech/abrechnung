import { MobilePaper } from "@/components/style";
import { useAppDispatch, useAppSelector } from "@/store";
import { SettlementPlanItem } from "@abrechnung/core";
import {
    createTransaction,
    selectAccountIdToAccountMap,
    selectSettlementPlan,
    useGroupCurrencyIdentifier,
} from "@abrechnung/redux";
import { Button, List, ListItem, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { Navigate, useNavigate } from "react-router";
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
    const settlementPlan = useAppSelector((state) => selectSettlementPlan(state, groupId));
    const currencyIdentifier = useGroupCurrencyIdentifier(groupId);
    const accountMap = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));

    if (!currencyIdentifier) {
        return <Navigate to="/404" />;
    }

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
                    <ListItem
                        key={`${planItem.creditorId}-${planItem.debitorId}`}
                        secondaryAction={
                            <Button onClick={() => onSettleClicked(planItem)}>
                                {t("accounts.settlement.settleButton")}
                            </Button>
                        }
                    >
                        <ListItemText
                            primary={
                                <span>
                                    {t("accounts.settlement.whoPaysWhom", "", {
                                        from: accountMap[planItem.creditorId].name,
                                        to: accountMap[planItem.debitorId].name,
                                        money: formatCurrency(planItem.paymentAmount, currencyIdentifier),
                                    })}
                                </span>
                            }
                        />
                    </ListItem>
                ))}
            </List>
        </MobilePaper>
    );
};
