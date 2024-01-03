import React from "react";
import { api } from "@/core/api";
import { Dialog, DialogTitle, DialogActions, DialogContent, Button, LinearProgress } from "@mui/material";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "@/store";
import { deleteAccount, selectAccountById } from "@abrechnung/redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";

interface Props {
    show: boolean;
    onClose: () => void;
    onAccountDeleted?: () => void;
    groupId: number;
    accountId: number | null;
}

export const DeleteAccountModal: React.FC<Props> = ({ show, onClose, groupId, accountId, onAccountDeleted }) => {
    const { t } = useTranslation();
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const dispatch = useAppDispatch();
    const [showProgress, setShowProgress] = React.useState(false);

    const accountTypeLabel = account?.type === "clearing" ? t("accounts.event") : t("accounts.account");

    const confirmDeleteAccount = () => {
        if (!account) {
            console.error("acount was undefined unexpectedly in delete modal");
            return;
        }
        setShowProgress(true);
        dispatch(deleteAccount({ groupId, accountId, api }))
            .unwrap()
            .then(() => {
                if (onAccountDeleted) {
                    onAccountDeleted();
                }
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
            <DialogTitle id="confirmation-dialog-title">
                {t("accounts.deleteConfirm", "", { accountType: accountTypeLabel })}
            </DialogTitle>
            <DialogContent dividers>
                {t("accounts.deleteConfirmBody", "", { accountType: accountTypeLabel, accountName: account?.name })}
            </DialogContent>
            <DialogActions>
                <Button autoFocus onClick={onClose} color="primary">
                    {t("common.cancel")}
                </Button>
                <Button onClick={confirmDeleteAccount} color="error">
                    {t("common.ok")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
