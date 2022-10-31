import React, { useState } from "react";
import PurchaseDebitorShares from "./PurchaseDebitorShares";
import TransactionCreditorShare from "../TransactionCreditorShare";
import TransactionDescription from "../TransactionDescription";
import TransactionBilledAt from "../TransactionBilledAt";
import TransactionValue from "../TransactionValue";
import { Button, Divider, Grid } from "@mui/material";
import FileGallery from "../FileGallery";
import TransactionActions from "../TransactionActions";
import TransactionPositions from "./TransactionPositions";
import { Add } from "@mui/icons-material";
import PurchaseDebitorSharesReadOnly from "./PurchaseDebitorSharesReadOnly";
import { MobilePaper } from "../../style/mobile";
import { Group, Transaction } from "@abrechnung/types";
import { useRecoilValue } from "recoil";
import { transactionBalanceEffect, transactionPositions, transactionAttachments } from "../../../state/transactions";

interface Props {
    group: Group;
    transaction: Transaction;
}

export const PurchaseDetails: React.FC<Props> = ({ group, transaction }) => {
    const [showPositions, setShowPositions] = useState(false);
    const positions = useRecoilValue(transactionPositions({ groupID: group.id, transactionID: transaction.id }));
    const balanceEffect = useRecoilValue(
        transactionBalanceEffect({ groupID: group.id, transactionID: transaction.id })
    );
    const attachments = useRecoilValue(transactionAttachments({ groupID: group.id, transactionID: transaction.id }));

    return (
        <>
            <MobilePaper>
                <TransactionActions groupID={group.id} transaction={transaction} />
                <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
                <Grid container>
                    <Grid item xs={12} md={transaction.hasUnpublishedChanges || attachments.length > 0 ? 6 : 12}>
                        <TransactionDescription transaction={transaction} />
                        <TransactionBilledAt transaction={transaction} />

                        <TransactionCreditorShare
                            group={group}
                            transaction={transaction}
                            isEditing={transaction.hasUnpublishedChanges}
                            label="Paid by"
                        />

                        <TransactionValue transaction={transaction} />
                    </Grid>

                    {(transaction.hasUnpublishedChanges || attachments.length > 0) && (
                        <Grid item xs={12} md={6} sx={{ marginTop: { xs: 1 } }}>
                            <FileGallery transaction={transaction} attachments={attachments} />
                        </Grid>
                    )}
                    <Grid item xs={12}>
                        {transaction.hasUnpublishedChanges ? (
                            <PurchaseDebitorShares
                                group={group}
                                transaction={transaction}
                                positions={positions}
                                showPositions={showPositions}
                                transactionBalanceEffect={balanceEffect}
                            />
                        ) : (
                            <PurchaseDebitorSharesReadOnly
                                group={group}
                                transaction={transaction}
                                positions={positions}
                                transactionBalanceEffect={balanceEffect}
                            />
                        )}
                    </Grid>
                </Grid>
            </MobilePaper>

            {!showPositions &&
            transaction.hasUnpublishedChanges &&
            positions.find((item) => !item.deleted) === undefined ? (
                <Grid container justifyContent="center" sx={{ marginTop: 2 }}>
                    <Button startIcon={<Add />} onClick={() => setShowPositions(true)}>
                        Add Positions
                    </Button>
                </Grid>
            ) : (showPositions && transaction.hasUnpublishedChanges) ||
              positions.find((item) => !item.deleted) !== undefined ? (
                <TransactionPositions
                    group={group}
                    transaction={transaction}
                    positions={positions}
                    transactionBalanceEffect={balanceEffect}
                />
            ) : null}
        </>
    );
};

export default PurchaseDetails;
