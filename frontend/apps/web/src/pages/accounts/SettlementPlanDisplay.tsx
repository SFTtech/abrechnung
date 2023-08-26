import { MobilePaper } from "@/components/style/mobile";
import { selectAccountSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import {
    createTransaction,
    selectAccountIdToAccountMap,
    selectGroupCurrencySymbol,
    selectSettlementPlan,
} from "@abrechnung/redux";
import { Button, List, ListItem, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { SettlementPlanItem } from "@abrechnung/core";
import { useNavigate } from "react-router-dom";

interface Props {
    groupId: number;
}

export const SettlementPlanDisplay: React.FC<Props> = ({ groupId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const settlementPlan = useAppSelector((state) => selectSettlementPlan({ state, groupId }));
    const currencySymbol = useAppSelector((state) =>
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
                    name: "Settlement",
                    value: planItem.paymentAmount,
                    creditorShares: { [planItem.creditorId]: 1 },
                    debitorShares: { [planItem.debitorId]: 1 },
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
            <Typography variant="h5">Settle this groups balances</Typography>
            <List>
                {settlementPlan.map((planItem) => (
                    <ListItem key={`${planItem.creditorId}-${planItem.debitorId}`}>
                        <ListItemText
                            primary={
                                <span>
                                    {accountMap[planItem.creditorId].name} pays {accountMap[planItem.debitorId].name}{" "}
                                    {planItem.paymentAmount.toFixed(2)}
                                    {currencySymbol}
                                </span>
                            }
                        />
                        <ListItemSecondaryAction>
                            <Button onClick={() => onSettleClicked(planItem)}>Settle</Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </MobilePaper>
    );
};
