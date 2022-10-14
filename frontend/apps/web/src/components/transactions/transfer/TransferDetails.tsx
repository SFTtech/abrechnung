import React from "react";
import TransactionCreditorShare from "../TransactionCreditorShare";
import TransactionDescription from "../TransactionDescription";
import TransactionBilledAt from "../TransactionBilledAt";
import TransactionValue from "../TransactionValue";
import TransactionDebitorShare from "../TransactionDebitorShare";
import TransactionActions from "../TransactionActions";
import { Divider, Grid } from "@mui/material";
import FileGallery from "../FileGallery";
import { MobilePaper } from "../../style/mobile";
import { Group } from "../../../state/groups";
import { Transaction } from "../../../state/transactions";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const TransferDetails: React.FC<Props> = ({ group, transaction }) => {
    return (
        <MobilePaper>
            <TransactionActions groupID={group.id} transaction={transaction} />
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            <Grid container>
                <Grid item xs={transaction.is_wip || transaction.files.length > 0 ? 6 : 12}>
                    <TransactionDescription group={group} transaction={transaction} />
                    <TransactionValue group={group} transaction={transaction} />
                    <TransactionBilledAt group={group} transaction={transaction} />

                    <TransactionCreditorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.is_wip}
                        label="From"
                    />

                    <TransactionDebitorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.is_wip}
                        label="To"
                    />
                </Grid>

                {(transaction.is_wip || transaction.files.length > 0) && (
                    <Grid item xs={6}>
                        <FileGallery transaction={transaction} />
                    </Grid>
                )}
            </Grid>
        </MobilePaper>
    );
};

export default TransferDetails;
