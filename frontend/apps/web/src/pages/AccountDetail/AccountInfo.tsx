import {
    accountEditStarted,
    deleteAccount,
    discardAccountChange,
    selectCurrentUserPermissions,
} from "@abrechnung/redux";
import React from "react";
import {
    Button,
    Chip,
    Dialog,
    Divider,
    DialogActions,
    DialogContent,
    DialogTitle,
    Grid,
    IconButton,
} from "@mui/material";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAppSelector, useAppDispatch, selectAccountSlice } from "../../store";
import { selectAccountById, saveAccount } from "@abrechnung/redux";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import AccountName from "./AccountName";
import AccountDescription from "./AccountDescription";
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

    const openDeleteDialog = () => setConfirmDeleteDialogOpen(true);
    const closeDeleteDialog = () => setConfirmDeleteDialogOpen(false);

    const confirmDeleteAccount = () => {
        dispatch(deleteAccount({ groupId, accountId, api }))
            .unwrap()
            .then(() => {
                navigate(`/groups/${groupId}/${account.type === "personal" ? "accounts" : "events"}`);
            })
            .catch((err) => toast.error(`error while deleting transaction: ${err}`));
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
        dispatch(saveAccount({ groupId, accountId, api }))
            .unwrap()
            .then(({ oldAccountId, account }) => {
                if (oldAccountId !== account.id) {
                    navigate(`/groups/${groupId}/accounts/${account.id}?no-redirect=true`);
                }
            })
            .catch((err) => toast.error(`error while saving account: ${err}`));
    };

    const abortEdit = () => {
        if (!account.isWip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        dispatch(discardAccountChange({ groupId, accountId, api }))
            .unwrap()
            .then(({ deletedAccount }) => {
                if (deletedAccount) {
                    navigate(`/groups/${groupId}/${account.type === "clearing" ? "events" : "accounts"}`);
                }
            })
            .catch((err) => toast.error(`error while cancelling edit: ${err}`));
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
            <Grid container>
                <Grid item xs={12}>
                    <AccountName groupId={groupId} accountId={accountId} />
                    <AccountDescription groupId={groupId} accountId={accountId} />
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
