import React from "react";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import {DialogActions} from "@material-ui/core";

export default function GroupDeleteModal({show, onClose, groupToDelete}) {

    const deleteGroup = () => {

    }

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
                <Button color="secondary" onClick={deleteGroup}>
                    Yes pls
                </Button>
                <Button color="primary" onClick={onClose}>
                    No
                </Button>
            </DialogActions>
        </Dialog>
    )
}