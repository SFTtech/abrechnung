import React, {useState} from "react";

import {useRecoilValue} from "recoil";
import {groupMembers, setGroupMemberPrivileges} from "../../recoil/groups";
import {sessionToken, userData} from "../../recoil/auth";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import DialogContentText from "@material-ui/core/DialogContentText";
import {Field, Form, Formik} from "formik";
import {Checkbox} from "formik-material-ui";
import LinearProgress from "@material-ui/core/LinearProgress";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Chip from "@material-ui/core/Chip";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import IconButton from "@material-ui/core/IconButton";
import Delete from "@material-ui/icons/Delete";
import Edit from "@material-ui/icons/Edit";
import {FormControlLabel, makeStyles} from "@material-ui/core";
import {toast} from "react-toastify";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupMemberList({group}) {
    const classes = useStyles();
    const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
    const [showRemoveMemberDialog, setShowRemoveMemberDialog] = useState(false);
    const [memberToRemove, setMemberToRemove] = useState(null);
    const [memberToEdit, setMemberToEdit] = useState(null);
    const members = useRecoilValue(groupMembers(group.group_id));
    const token = useRecoilValue(sessionToken);
    const currentUser = useRecoilValue(userData);

    const handleEditMemberSubmit = (values, {setSubmitting}) => {
        setGroupMemberPrivileges({
            sessionToken: token,
            groupID: group.group_id,
            userID: values.userID,
            canWrite: values.canWrite,
            isOwner: values.isOwner
        })
            .then(result => {
                setShowEditMemberDialog(false);
                toast.success("Successfully updated group member permissions", {
                    position: "top-right",
                    autoClose: 5000,
                });
            })
            .catch(err => {

            })
    }

    const closeEditMemberModal = () => {
        setShowEditMemberDialog(false);
        setMemberToEdit(null);
    };

    const openEditMemberModal = (userID) => {
        const user = members.find(member => member.user_id === userID);
        // TODO: maybe deal with disappearing users in the list
        setMemberToEdit(user);
        setShowEditMemberDialog(true);
    };

    const onRemoveMemberSave = () => {
    };

    const closeRemoveMemberModal = () => {
        setShowRemoveMemberDialog(false);
        setMemberToRemove(null);
    };

    const openRemoveMemberModal = (userID) => {
        setMemberToRemove(userID);
        setShowRemoveMemberDialog(true);
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {members.length === 0 ? (
                    <ListItem><ListItemText primary="No Members"/></ListItem>
                ) : (
                    members.map((member, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={member.username}
                                secondary={
                                    <>
                                        {member.is_owner ? (
                                            <Chip size="small" component="span" color="primary" label="owner"
                                                  variant="outlined"/>
                                        ) : member.can_write ? (
                                            <Chip size="small" component="span" color="primary" label="editor"
                                                  variant="outlined"/>
                                        ) : null}
                                        {member.username === currentUser.username ? (
                                            <Chip size="small" component="span" color="primary" label="it's you"/>
                                        ) : (
                                            ""
                                        )}
                                        <br/>
                                        <small className="text-muted">
                                            {member.description}, joined {member.joined}
                                        </small>
                                    </>
                                }
                            />
                            {group.is_owner || group.can_write ? (
                                <ListItemSecondaryAction>
                                    <IconButton
                                        onClick={() => openEditMemberModal(member.user_id)}
                                    >
                                        <Edit/>
                                    </IconButton>
                                    <IconButton
                                        onClick={() => openRemoveMemberModal(member.user_id)}
                                    >
                                        <Delete/>
                                    </IconButton>
                                </ListItemSecondaryAction>
                            ) : (
                                ""
                            )}
                        </ListItem>
                    ))
                )}
            </List>
            <Dialog open={showEditMemberDialog} onClose={closeEditMemberModal}>
                <DialogTitle>Edit Group Member</DialogTitle>
                <DialogContent>
                    <Formik initialValues={{
                        userID: memberToEdit?.user_id,
                        isOwner: memberToEdit?.is_owner,
                        canWrite: memberToEdit?.can_write
                    }} onSubmit={handleEditMemberSubmit}
                            enableReinitialize={true}>
                        {({handleSubmit, isSubmitting}) => (
                            <Form>
                                <FormControlLabel control={
                                    <Field
                                        type="checkbox"
                                        margin="normal"
                                        component={Checkbox}
                                        name="canWrite"
                                    />
                                } label="Can Write"/>
                                <FormControlLabel control={
                                    <Field
                                        type="checkbox"
                                        margin="normal"
                                        component={Checkbox}
                                        name="isOwner"
                                    />
                                } label="Is Owner"/>

                                {isSubmitting && <LinearProgress/>}
                                <DialogActions>
                                    <Button color="primary" type="submit" onClick={handleSubmit}>
                                        Save
                                    </Button>
                                    <Button color="secondary" onClick={closeEditMemberModal}>
                                        Close
                                    </Button>
                                </DialogActions>

                            </Form>
                        )}
                    </Formik>
                </DialogContent>
            </Dialog>
            <Dialog open={showRemoveMemberDialog} onClose={closeRemoveMemberModal}>
                <DialogTitle>Remove Member from Group</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to remove{" "}
                        <strong>
                            {memberToRemove !== null
                                ? members.find((user) => user.user_id === memberToRemove).username
                                : ""}
                        </strong>{" "}
                        from this group?
                    </DialogContentText>
                </DialogContent>

                <DialogActions>
                    <Button color="secondary" type="submit" onClick={onRemoveMemberSave}>
                        Yes I'm sure.
                    </Button>
                    <Button color="primary" onClick={closeRemoveMemberModal}>
                        On second thought ...
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
