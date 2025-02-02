import { ChevronLeft, Delete, Edit, MoreVert } from "@mui/icons-material";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid2 as Grid,
    IconButton,
    LinearProgress,
    Menu,
    MenuItem,
} from "@mui/material";
import React, { useState } from "react";
import { Navigate, useNavigate, Link as RouterLink } from "react-router";
import { useTranslation } from "react-i18next";
import { Transaction } from "@abrechnung/types";
import { useGroup, useIsGroupWritable } from "@abrechnung/redux";

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
    const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
    const moreMenuOpen = Boolean(anchorEl);
    const handleOpenMoreMenu = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };
    const handleCloseMoreMenu = () => {
        setAnchorEl(null);
    };
    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = useState(false);

    const isGroupWritable = useIsGroupWritable(groupId);
    const group = useGroup(groupId);

    if (!group) {
        return <Navigate to="/404" />;
    }

    const navigateBack = () => {
        navigate(-1);
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <Grid display="flex" alignItems="center">
                    <IconButton sx={{ display: { xs: "none", md: "inline-flex" } }} onClick={navigateBack}>
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={t(`transactions.type.${transaction.type}`)} />
                </Grid>
                <Grid>
                    {isGroupWritable && (
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
                    <IconButton color="primary" onClick={handleOpenMoreMenu}>
                        <MoreVert />
                    </IconButton>
                    <Menu
                        open={moreMenuOpen}
                        anchorOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                        keepMounted
                        anchorEl={anchorEl}
                        transformOrigin={{
                            vertical: "top",
                            horizontal: "right",
                        }}
                        onClose={handleCloseMoreMenu}
                    >
                        <MenuItem
                            component={RouterLink}
                            to={`/groups/${group.id}/transactions/${transaction.id}/history`}
                        >
                            {t("transactions.history.linkTo")}
                        </MenuItem>
                    </Menu>
                </Grid>
            </Grid>
            {showProgress && <LinearProgress />}
            <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={confirmDeleteDialogOpen}>
                <DialogTitle id="confirmation-dialog-title">{t("transactions.confirmDeleteTransaction")}</DialogTitle>
                <DialogContent dividers>
                    {t("transactions.confirmDeleteTransactionInfo", { transaction })}
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
