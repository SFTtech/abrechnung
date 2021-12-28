import React, {useState} from "react";
import {useRecoilValue} from "recoil";
import {transactionsSeenByUser} from "../../recoil/transactions";
import TransactionCreateModal from "./TransactionCreateModal";
import {currUserPermissions} from "../../recoil/groups";
import {Divider, Grid, IconButton, List} from "@mui/material";
import {Add} from "@mui/icons-material";
import {TransactionLogEntry} from "./TransactionLogEntry";

export default function TransactionLog({group}) {
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const transactions = useRecoilValue(transactionsSeenByUser(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));

    return (
        <div>
            {userPermissions.can_write && (
                <Grid container justifyContent="center">
                    <IconButton color="primary" onClick={() => setShowCreateDialog(true)}>
                        <Add/>
                    </IconButton>
                </Grid>
            )}
            <Divider variant="middle"/>
            <List>
                {transactions.length === 0 ? (
                    <div className="list-group-item" key={0}>No Transactions</div>
                ) : (
                    transactions.map(transaction => (
                        <TransactionLogEntry key={transaction.id} group={group} transaction={transaction}/>
                    ))
                )}
            </List>
            <TransactionCreateModal group={group} show={showCreateDialog}
                                    onClose={() => setShowCreateDialog(false)}/>
        </div>
    );
}
