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
import { useAppSelector, selectTransactionSlice } from "../../../store";
import { selectTransactionById, selectTransactionAttachments } from "@abrechnung/redux";

interface Props {
    groupId: number;
    transactionId: number;
}

export const TransferDetails: React.FC<Props> = ({ groupId, transactionId }) => {
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const attachments = useAppSelector((state) =>
        selectTransactionAttachments({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    return (
        <MobilePaper>
            <TransactionActions groupId={groupId} transactionId={transactionId} />
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            <Grid container>
                <Grid item xs={transaction.isWip || attachments.length > 0 ? 6 : 12}>
                    <TransactionDescription transactionId={transactionId} groupId={groupId} />
                    <TransactionValue transactionId={transactionId} groupId={groupId} />
                    <TransactionBilledAt transactionId={transactionId} groupId={groupId} />

                    <TransactionCreditorShare
                        groupId={groupId}
                        transactionId={transactionId}
                        isEditing={transaction.isWip}
                        label="From"
                    />

                    <TransactionDebitorShare
                        groupId={groupId}
                        transactionId={transactionId}
                        isEditing={transaction.isWip}
                        label="To"
                    />
                </Grid>

                {(transaction.isWip || attachments.length > 0) && (
                    <Grid item xs={6}>
                        <FileGallery groupId={groupId} transactionId={transactionId} />
                    </Grid>
                )}
            </Grid>
        </MobilePaper>
    );
};

export default TransferDetails;
