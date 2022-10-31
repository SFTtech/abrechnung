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
import { Group, Transaction } from "@abrechnung/types";
import { useRecoilValue } from "recoil";
import { transactionAttachments } from "../../../state/transactions";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const TransferDetails: React.FC<Props> = ({ group, transaction }) => {
    const attachments = useRecoilValue(transactionAttachments({ groupID: group.id, transactionID: transaction.id }));
    return (
        <MobilePaper>
            <TransactionActions groupID={group.id} transaction={transaction} />
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            <Grid container>
                <Grid item xs={transaction.hasUnpublishedChanges || attachments.length > 0 ? 6 : 12}>
                    <TransactionDescription transaction={transaction} />
                    <TransactionValue transaction={transaction} />
                    <TransactionBilledAt transaction={transaction} />

                    <TransactionCreditorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.hasUnpublishedChanges}
                        label="From"
                    />

                    <TransactionDebitorShare
                        group={group}
                        transaction={transaction}
                        isEditing={transaction.hasUnpublishedChanges}
                        label="To"
                    />
                </Grid>

                {(transaction.hasUnpublishedChanges || attachments.length > 0) && (
                    <Grid item xs={6}>
                        <FileGallery transaction={transaction} attachments={attachments} />
                    </Grid>
                )}
            </Grid>
        </MobilePaper>
    );
};

export default TransferDetails;
