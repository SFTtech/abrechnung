import React from "react";
import { deleteGroup } from "../../api";
import { toast } from "react-toastify";
import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@mui/material";

export default function GroupDeleteModal({ show, onClose, groupToDelete }) {

    const confirmDeleteGroup = () => {
        deleteGroup({ groupID: groupToDelete.id })
            .then(res => {
                onClose();
            })
            .catch(err => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Delete Group</DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {groupToDelete ? (
                        <span>Are you sure you want to delete group {groupToDelete.name}</span>
                    ) : null}
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <Button color="primary" onClick={onClose}>
                    No
                </Button>
                <Button color="error" onClick={confirmDeleteGroup}>
                    Yes pls
                </Button>
            </DialogActions>
        </Dialog>
    );
}
