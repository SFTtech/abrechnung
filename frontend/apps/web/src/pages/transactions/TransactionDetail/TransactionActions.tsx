import { selectCurrentUserPermissions } from "@abrechnung/redux";
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
import { Navigate, useNavigate } from "react-router-dom";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Transaction } from "@abrechnung/types";

interface Props {
    groupId: number;
    transaction: Transaction;
    showProgress?: boolean | undefined;
    onDelete: () => void;
    onStartEdit: () => void;
    onAbortEdit: () => void;
    onCommitEdit: () => void;
}

export const TransactionActions: React.FC<Props> = ({
    groupId,
    transaction,
    onDelete,
    onStartEdit,
    onCommitEdit,
    onAbortEdit,
    showProgress = false,
}) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    if (!permissions) {
        return <Navigate to="/404" />;
    }

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
                                        {t("common.save")}
                                    </Button>
                                    <Button color="error" onClick={onAbortEdit}>
                                        {t("common.cancel")}
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
                <DialogTitle id="confirmation-dialog-title">{t("transactions.confirmDeleteTransaction")}</DialogTitle>
                <DialogContent dividers>
                    {t("transactions.confirmDeleteTransactionInfo", "", { transaction })}
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={() => setConfirmDeleteDialogOpen(false)} color="primary">
                        {t("common.cancel")}
                    </Button>
                    <Button onClick={onDelete} color="error">
                        {t("common.ok")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
