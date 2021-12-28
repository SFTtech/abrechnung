import React, { useState } from "react";

import { useRecoilValue } from "recoil";
import { userData } from "../../recoil/auth";
import { Form, Formik } from "formik";
import { toast } from "react-toastify";
import { updateGroupMemberPrivileges } from "../../api";
import { DateTime } from "luxon";
import { currUserPermissions, groupMembers } from "../../recoil/groups";
import {
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    LinearProgress,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    },
    chip: {
        marginRight: theme.spacing(1)
    }
}));

export default function GroupMemberList({ group }) {
    const classes = useStyles();
    const [showEditMemberDialog, setShowEditMemberDialog] = useState(false);
    const [memberToEdit, setMemberToEdit] = useState(null);
    const currentUser = useRecoilValue(userData);
    const members = useRecoilValue(groupMembers(group.id));
    const permissions = useRecoilValue(currUserPermissions(group.id));

    const handleEditMemberSubmit = (values, { setSubmitting }) => {
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
        return member.username;
    };

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

    return (
        <Paper elevation={1} className={classes.paper}>
            <List>
                {members.length === 0 ? (
                    <ListItem><ListItemText primary="No Members" /></ListItem>
                ) : (
                    members.map((member, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={(
                                    <>
                                        <span style={{ marginRight: 5 }}>{member.username}</span>
                                        {member.is_owner ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="owner"
                                                  variant="outlined" />
                                        ) : member.can_write ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="editor"
                                                  variant="outlined" />
                                        ) : null}
                                        {member.user_id === currentUser.id ? (
                                            <Chip size="small" className={classes.chip} component="span" color="primary"
                                                  label="it's you" />
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
                                        <Edit />
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
                        {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                            <Form>
                                <FormControlLabel control={
                                    <Checkbox
                                        type="checkbox"
                                        margin="normal"
                                        name="canWrite"
                                        onBlur={handleBlur}
                                        onChange={handleChange}
                                        value={values.canWrite}
                                    />
                                } label="Can Write" />
                                <FormControlLabel control={
                                    <Checkbox
                                        type="checkbox"
                                        margin="normal"
                                        name="isOwner"
                                        onBlur={handleBlur}
                                        onChange={handleChange}
                                        value={values.isOwner}
                                    />
                                } label="Is Owner" />

                                {isSubmitting && <LinearProgress />}
                                <DialogActions>
                                    <Button color="primary" type="submit" onClick={handleSubmit}>
                                        Save
                                    </Button>
                                    <Button color="error" onClick={closeEditMemberModal}>
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
