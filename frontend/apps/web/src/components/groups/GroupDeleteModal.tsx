import { Group } from "@abrechnung/types";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";
import React from "react";
import { toast } from "react-toastify";
import { api } from "../../core/api";

interface Props {
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
    groupToDelete: Group;
}

export const GroupDeleteModal: React.FC<Props> = ({ show, onClose, groupToDelete }) => {
    const confirmDeleteGroup = () => {
        api.client.groups
            .deleteGroup({ groupId: groupToDelete.id })
            .then((res) => {
                onClose({}, "completed");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {groupToDelete ? <span>Are you sure you want to delete group {groupToDelete.name}</span> : null}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="primary" onClick={() => onClose({}, "closeButton")}>
                    No
                </Button>
                <Button color="error" onClick={confirmDeleteGroup}>
                    Yes pls
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default GroupDeleteModal;
