import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React from "react";
import { toast } from "react-toastify";
import { api } from "@/core/api";
import { Group } from "@abrechnung/api";
import { useTranslation } from "react-i18next";

interface Props {
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
    groupToDelete: Group;
}

export const GroupDeleteModal: React.FC<Props> = ({ show, onClose, groupToDelete }) => {
    const { t } = useTranslation();
    const confirmDeleteGroup = () => {
        api.client.groups
            .deleteGroup({ groupId: groupToDelete.id })
            .then(() => {
                onClose({}, "completed");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>{t("groups.delete.title")}</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {groupToDelete ? (
                        <span>{t("groups.delete.description", { groupName: groupToDelete.name })}</span>
                    ) : null}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="primary" onClick={() => onClose({}, "closeButton")}>
                    {t("common.no")}
                </Button>
                <Button color="error" onClick={confirmDeleteGroup}>
                    {t("common.yes")}
                </Button>
            </DialogActions>
        </Dialog>
    );
};
