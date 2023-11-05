import { selectCurrentUserPermissions, selectTransactionById } from "@abrechnung/redux";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
    LinearProgress,
} from "@mui/material";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { selectTransactionSlice, useAppSelector } from "../../../store";

interface Props {
    groupId: number;
    transactionId: number;
    showProgress?: boolean | undefined;
    onDelete: () => void;
    onStartEdit: () => void;
    onAbortEdit: () => void;
    onCommitEdit: () => void;
}

export const TransactionActions: React.FC<Props> = ({
    groupId,
    transactionId,
    onDelete,
    onStartEdit,
    onCommitEdit,
    onAbortEdit,
    showProgress = false,
}) => {
    const navigate = useNavigate();
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const transactionTypeLabel = transaction.type === "purchase" ? "purchase" : "transfer";

    const navigateBack = () => {
        navigate(-1);
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <Grid item sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton sx={{ display: { xs: "none", md: "inline-flex" } }} onClick={navigateBack}>
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={transactionTypeLabel} />
                </Grid>
                <Grid item>
                    {permissions.canWrite && (
                        <>
                            {transaction.is_wip ? (
                                <>
                                    <Button color="primary" onClick={onCommitEdit}>
                                        Save
                                    </Button>
                                    <Button color="error" onClick={onAbortEdit}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <IconButton color="primary" onClick={onStartEdit}>
                                    <Edit />
                                </IconButton>
                            )}
                            <IconButton color="error" onClick={() => setConfirmDeleteDialogOpen(true)}>
                                <Delete />
                            </IconButton>
                        </>
                    )}
                </Grid>
            </Grid>
            {showProgress && <LinearProgress />}
            <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={confirmDeleteDialogOpen}>
                <DialogTitle id="confirmation-dialog-title">Confirm delete transaction</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the transaction &quot;{transaction.name}&quot;
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setConfirmDeleteDialogOpen(false)} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={onDelete} color="error">
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export default TransactionActions;
