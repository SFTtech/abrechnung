import React from "react";
import { api } from "../../core/api";
import { Dialog, DialogTitle, DialogActions, DialogContent, Button } from "@mui/material";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { deleteAccount, selectAccountById } from "@abrechnung/redux";
import { toast } from "react-toastify";

interface Props {
    show: boolean;
    onClose: () => void;
    groupId: number;
    accountId: number | null;
}

export const DeleteAccountModal: React.FC<Props> = ({ show, onClose, groupId, accountId }) => {
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const dispatch = useAppDispatch();

    const onDeleteAccount = () => {
        if (account) {
            dispatch(deleteAccount({ groupId, accountId, api }))
                .then((res) => {
                    console.log("success in delete account modal", res);
                    onClose();
                })
                .catch((err) => {
                    console.log("error in delete account modal", err);
                    toast.error(err);
                });
        }
    };

    return (
        <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={show}>
            <DialogTitle id="confirmation-dialog-title">Confirm delete account</DialogTitle>
            <DialogContent dividers>
                Are you sure you want to delete the account &quot;
                {account?.name}&quot;
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} color="primary">
                    Cancel
                </Button>
                <Button onClick={onDeleteAccount} color="error">
                    Ok
                </Button>
            </DialogActions>
        </Dialog>
    );
};
