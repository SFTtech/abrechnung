import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { transactionsSeenByUser } from "../../recoil/transactions";
import TransactionCreateModal from "./TransactionCreateModal";
import { currUserPermissions } from "../../recoil/groups";
import { Alert, Divider, Fab, Grid, IconButton, List, Paper } from "@mui/material";
import { Add } from "@mui/icons-material";
import { TransactionListEntry } from "./TransactionListEntry";

export default function TransactionList({ group }) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    return (
        <>
            <Paper sx={{ padding: 2 }}>
                {userPermissions.can_write && (
                    <>
                        <Grid container justifyContent="center">
                            <IconButton color="primary" onClick={() => setShowCreateDialog(true)}>
                                <Add />
                            </IconButton>
                        </Grid>
                        <Divider variant="middle" />
                    </>
                )}
                <List>
                    {transactions.length === 0 ? (
                        <Alert severity="info">No Transactions</Alert>
                    ) : (
                        transactions.map((transaction) => (
                            <TransactionListEntry key={transaction.id} group={group} transaction={transaction} />
                        ))
                    )}
                </List>
                <TransactionCreateModal
                    group={group}
                    show={showCreateDialog}
                    onClose={() => setShowCreateDialog(false)}
                />
            </Paper>
            {userPermissions.can_write && (
                <Fab
                    color="primary"
                    aria-label="add"
                    sx={{ position: "fixed", right: 20, bottom: 20 }}
                    onClick={() => setShowCreateDialog(true)}
                >
                    <Add />
                </Fab>
            )}
        </>
    );
}
