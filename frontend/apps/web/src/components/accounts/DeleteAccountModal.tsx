import React from "react";
import { api } from "../../core/api";
import { Dialog, DialogTitle, DialogActions, DialogContent, Button, LinearProgress } from "@mui/material";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { deleteAccount, selectAccountById } from "@abrechnung/redux";
import { toast } from "react-toastify";

interface Props {
    show: boolean;
    onClose: () => void;
    onAccountDeleted?: () => void;
    groupId: number;
    accountId: number | null;
}

export const DeleteAccountModal: React.FC<Props> = ({ show, onClose, groupId, accountId, onAccountDeleted }) => {
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const dispatch = useAppDispatch();
    const [showProgress, setShowProgress] = React.useState(false);

    const accountTypeLabel = account?.type === "clearing" ? "event" : "account";

    const confirmDeleteAccount = () => {
        if (!account) {
            console.error("acount was undefined unexpectedly in delete modal");
            return;
        }
        setShowProgress(true);
        dispatch(deleteAccount({ groupId, accountId, api }))
            .unwrap()
            .then(() => {
                onAccountDeleted();
                setShowProgress(false);
            })
            .catch((err) => {
                toast.error(
                    `error while deleting ${account.type === "personal" ? "account" : "event"}: ${
                        err.message ?? err.toString()
                    }`
                );
                onClose();
                setShowProgress(false);
            });
    };

    return (
        <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={show}>
            {showProgress && <LinearProgress />}
            <DialogTitle id="confirmation-dialog-title">Confirm delete {accountTypeLabel}</DialogTitle>
            <DialogContent dividers>
                Are you sure you want to delete the {accountTypeLabel} &quot;{account?.name}&quot;
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={confirmDeleteAccount} color="error">
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
};
