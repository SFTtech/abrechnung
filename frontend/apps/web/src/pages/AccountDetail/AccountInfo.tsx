import {
    accountEditStarted,
    deleteAccount,
    discardAccountChange,
    saveAccount,
    selectAccountById,
    selectCurrentUserPermissions,
} from "@abrechnung/redux";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    Grid,
    IconButton,
    LinearProgress,
} from "@mui/material";
import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import AccountDescription from "./AccountDescription";
import AccountName from "./AccountName";
import { AccountTags } from "./AccountTags";
import ClearingAccountDate from "./ClearingAccountDate";
import { ClearingShares } from "./ClearingShares";

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountInfo: React.FC<Props> = ({ groupId, accountId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);

    const openDeleteDialog = () => setConfirmDeleteDialogOpen(true);
    const closeDeleteDialog = () => setConfirmDeleteDialogOpen(false);

    const confirmDeleteAccount = () => {
        setShowProgress(true);
        dispatch(deleteAccount({ groupId, accountId, api }))
            .unwrap()
            .then(() => {
                setShowProgress(false);
                navigate(`/groups/${groupId}/${account.type === "personal" ? "accounts" : "events"}`);
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while deleting transaction: ${err.toString()}`);
            });
    };

    const accountTypeLabel = account.type === "clearing" ? "event" : "account";

    const edit = () => {
        if (!account.isWip) {
            dispatch(accountEditStarted({ groupId, accountId }));
        }
    };

    const commitEdit = () => {
        if (!account.isWip) {
            toast.error("Cannot save as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(saveAccount({ groupId, accountId, api }))
            .unwrap()
            .then(({ oldAccountId, account }) => {
                setShowProgress(false);
                if (oldAccountId !== account.id) {
                    navigate(`/groups/${groupId}/accounts/${account.id}?no-redirect=true`);
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while saving account: ${err.toString()}`);
            });
    };

    const abortEdit = () => {
        if (!account.isWip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(discardAccountChange({ groupId, accountId, api }))
            .unwrap()
            .then(({ deletedAccount }) => {
                setShowProgress(false);
                if (deletedAccount) {
                    navigate(`/groups/${groupId}/${account.type === "clearing" ? "events" : "accounts"}`);
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while cancelling edit: ${err.toString()}`);
            });
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <Grid item sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                        sx={{ display: { xs: "none", md: "inline-flex" } }}
                        component={RouterLink}
                        to={account.type === "clearing" ? `/groups/${groupId}/events` : `/groups/${groupId}/accounts`}
                    >
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={accountTypeLabel} />
                </Grid>
                <Grid item>
                    {permissions.canWrite && (
                        <>
                            {account.isWip ? (
                                <>
                                    <Button color="primary" onClick={commitEdit}>
                                        Save
                                    </Button>
                                    <Button color="error" onClick={abortEdit}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <IconButton color="primary" onClick={edit}>
                                    <Edit />
                                </IconButton>
                            )}
                            <IconButton color="error" onClick={openDeleteDialog}>
                                <Delete />
                            </IconButton>
                        </>
                    )}
                </Grid>
            </Grid>
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            {showProgress && <LinearProgress />}
            <Grid container>
                <Grid item xs={12}>
                    <AccountName groupId={groupId} accountId={accountId} />
                    <AccountDescription groupId={groupId} accountId={accountId} />
                    {account.type === "personal" && null}
                    {account.type === "clearing" && (
                        <>
                            <AccountTags groupId={groupId} accountId={accountId} />
                            <ClearingAccountDate groupId={groupId} accountId={accountId} />
                        </>
                    )}
                </Grid>
                {account.type === "clearing" && account.isWip ? (
                    <Grid item xs={12}>
                        <ClearingShares groupId={groupId} accountId={accountId} />
                    </Grid>
                ) : null}
            </Grid>

            <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={confirmDeleteDialogOpen}>
                <DialogTitle id="confirmation-dialog-title">Confirm delete {accountTypeLabel}</DialogTitle>
                <DialogContent dividers>
                    Are you sure you want to delete the {accountTypeLabel} &quot;{account.name}&quot;
                </DialogContent>
                <DialogActions>
                    <Button autoFocus onClick={closeDeleteDialog} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={confirmDeleteAccount} color="error">
                        Ok
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};
