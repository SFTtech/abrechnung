import React from "react";
import { api } from "@/core/api";
import { Dialog, DialogTitle, DialogActions, DialogContent, Button, LinearProgress } from "@mui/material";
import { useAppDispatch } from "@/store";
import { deleteAccount } from "@abrechnung/redux";
import { toast } from "react-toastify";
import { useTranslation } from "react-i18next";
import { Account } from "@abrechnung/types";
import { stringifyError } from "@abrechnung/api";

interface Props {
    show: boolean;
    onClose: () => void;
    onAccountDeleted?: () => void;
    groupId: number;
    account: Account | null;
}

export const DeleteAccountModal: React.FC<Props> = ({ show, onClose, groupId, account, onAccountDeleted }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const [showProgress, setShowProgress] = React.useState(false);

    const accountTypeLabel = account?.type === "clearing" ? t("accounts.event") : t("accounts.account");

    const confirmDeleteAccount = () => {
        if (!account) {
            console.error("acount was undefined unexpectedly in delete modal");
            return;
        }
        setShowProgress(true);
        dispatch(deleteAccount({ groupId, accountId: account.id, api }))
            .unwrap()
            .then(() => {
                if (onAccountDeleted) {
                    onAccountDeleted();
                }
                setShowProgress(false);
            })
            .catch((err) => {
                toast.error(
                    `error while deleting ${account.type === "personal" ? "account" : "event"}: ${stringifyError(err)}`
                );
                onClose();
                setShowProgress(false);
            });
    };

    return (
        <Dialog maxWidth="xs" aria-labelledby="confirmation-dialog-title" open={show}>
            {showProgress && <LinearProgress />}
            <DialogTitle id="confirmation-dialog-title">
                {t("accounts.deleteConfirm", { accountType: accountTypeLabel })}
            </DialogTitle>
            <DialogContent dividers>
                {t("accounts.deleteConfirmBody", { accountType: accountTypeLabel, accountName: account?.name })}
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
