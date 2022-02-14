import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { transactionsSeenByUser } from "../../recoil/transactions";
import { currUserPermissions } from "../../recoil/groups";
import { Alert, List, SpeedDial, SpeedDialAction, SpeedDialIcon } from "@mui/material";
import { CompareArrows, ShoppingCart } from "@mui/icons-material";
import { TransactionListEntry } from "./TransactionListEntry";
import { MobilePaper } from "../style/mobile";
import PurchaseCreateModal from "./purchase/PurchaseCreateModal";
import TransferCreateModal from "./transfer/TransferCreateModal";
import { useTitle } from "../../utils";

export default function TransactionList({ group }) {
    const [showTransferCreateDialog, setShowTransferCreateDialog] = useState(false);
    const [showPurchaseCreateDialog, setShowPurchaseCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    useTitle(`${group.name} - Transactions`);

    return (
        <>
            <MobilePaper>
                <List>
                    {transactions.length === 0 ? (
                        <Alert severity="info">No Transactions</Alert>
                    ) : (
                        transactions.map((transaction) => (
                            <TransactionListEntry key={transaction.id} group={group} transaction={transaction} />
                        ))
                    )}
                </List>
                <TransferCreateModal
                    group={group}
                    show={showTransferCreateDialog}
                    onClose={() => setShowTransferCreateDialog(false)}
                />
                <PurchaseCreateModal
                    group={group}
                    show={showPurchaseCreateDialog}
                    onClose={() => setShowPurchaseCreateDialog(false)}
                />
            </MobilePaper>
            {userPermissions.can_write && (
                <SpeedDial
                    ariaLabel="Create Account"
                    sx={{ position: "fixed", bottom: 20, right: 20 }}
                    icon={<SpeedDialIcon />}
                >
                    <SpeedDialAction
                        icon={<ShoppingCart />}
                        tooltipTitle="Create Purchase"
                        onClick={() => setShowPurchaseCreateDialog(true)}
                    />
                    <SpeedDialAction
                        icon={<CompareArrows />}
                        tooltipTitle="Create Transfer"
                        onClick={() => setShowTransferCreateDialog(true)}
                    />
                </SpeedDial>
            )}
        </>
    );
}
