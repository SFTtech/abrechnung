import { selectAccountIdToAccountMap, selectGroupCurrencySymbol, selectSettlementPlan } from "@abrechnung/redux";
import { Button, List, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import * as React from "react";
import { MobilePaper } from "../../components/style/mobile";
import { selectAccountSlice, selectGroupSlice, useAppSelector } from "../../store";

interface Props {
    groupId: number;
}

export const SettlementPlanDisplay: React.FC<Props> = ({ groupId }) => {
    const settlementPlan = useAppSelector((state) => selectSettlementPlan({ state, groupId }));
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const accountMap = useAppSelector((state) =>
        selectAccountIdToAccountMap({ state: selectAccountSlice(state), groupId })
    );

    return (
        <MobilePaper>
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
                            <Button>Settled</Button>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
        </MobilePaper>
    );
};
