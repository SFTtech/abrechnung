import React, {useState} from "react";

import {useRecoilValue} from "recoil";
import {userData} from "../../recoil/auth";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogContent from "@material-ui/core/DialogContent";
import DialogActions from "@material-ui/core/DialogActions";
import Button from "@material-ui/core/Button";
import {Field, Form, Formik} from "formik";
import {Checkbox} from "formik-material-ui";
import LinearProgress from "@material-ui/core/LinearProgress";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import Chip from "@material-ui/core/Chip";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import IconButton from "@material-ui/core/IconButton";
import Edit from "@material-ui/icons/Edit";
import {FormControlLabel, makeStyles, Paper} from "@material-ui/core";
import {toast} from "react-toastify";
import {updateGroupMemberPrivileges} from "../../api";
import {DateTime} from "luxon";
import {currUserPermissions, groupMembers} from "../../recoil/groups";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    },
    chip: {
        marginRight: theme.spacing(1)
    }
}));

export default function GroupMemberList({group}) {
    const classes = useStyles();
    const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);
    const currentUser = useRecoilValue(userData);
    const members = useRecoilValue(groupMembers(group.id));
    const permissions = useRecoilValue(currUserPermissions(group.id));

    const handleEditMemberSubmit = (values, {setSubmitting}) => {
        updateGroupMemberPrivileges({
            groupID: group.id,
            userID: values.userID,
            canWrite: values.canWrite,
            isOwner: values.isOwner
        })
            .then(result => {
                setSubmitting(false);
                setShowEditMemberDialog(false);
                toast.success("Successfully updated group member permissions");
            })
            .catch(err => {
                setSubmitting(false);
                toast.error(err);
            });
    };

    const getMemberUsername = (member_id) => {
        const member = members.find(member => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username
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
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {members.length === 0 ? (
                    <ListItem><ListItemText primary="No Members"/></ListItem>
                ) : (
                    members.map((member, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={(
                                    <>
                                        <span style={{marginRight: 5}}>{member.username}</span>
                                        {member.is_owner ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="owner"
                                                  variant="outlined"/>
                                        ) : member.can_write ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="editor"
                                                  variant="outlined"/>
                                        ) : null}
                                        {member.user_id === currentUser.id ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="it's you"/>
                                        ) : (
                                            ""
                                        )}
                                    </>
                                )}
                                secondary={
                                    <>
                                    {member.invited_by && (
                                        <small className="text-muted">
                                            invited by {getMemberUsername(member.invited_by)}
                                        </small>
                                    )}
                                    <small className="text-muted">
                                        joined {DateTime.fromISO(member.joined_at).toLocaleString(DateTime.DATETIME_FULL)}
                                    </small>
                                    </>
                                }
                            />
                            {permissions.is_owner || permissions.can_write ? (
                                <ListItemSecondaryAction>
                                    <IconButton
                                        onClick={() => openEditMemberModal(member.user_id)}
                                    >
                                        <Edit/>
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
        </Paper>
    );
}
