import React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import { DialogActions } from "@material-ui/core";
import { deleteGroup } from "../../api";
import { toast } from "react-toastify";

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
                <Button color="secondary" onClick={confirmDeleteGroup}>
                    Yes pls
                </Button>
                <Button color="primary" onClick={onClose}>
                    No
                </Button>
            </DialogActions>
        </Dialog>
    );
}