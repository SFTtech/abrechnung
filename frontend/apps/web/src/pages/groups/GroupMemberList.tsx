import React, { useState } from "react";
import { Form, Formik } from "formik";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import { DateTime } from "luxon";
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
} from "@mui/material";
import { Edit } from "@mui/icons-material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import {
    selectCurrentUserId,
    selectCurrentUserPermissions,
    selectGroupById,
    selectGroupMembers,
    updateGroupMemberPrivileges,
} from "@abrechnung/redux";
import { useAppSelector, selectGroupSlice, selectAuthSlice, useAppDispatch } from "../../store";
import { GroupMember } from "@abrechnung/types";

interface Props {
    groupId: number;
}

export const GroupMemberList: React.FC<Props> = ({ groupId }) => {
    const dispatch = useAppDispatch();
    const currentUserId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));
    const members = useAppSelector((state) => selectGroupMembers({ state: selectGroupSlice(state), groupId }));
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const [memberToEdit, setMemberToEdit] = useState<GroupMember | undefined>(undefined);

    useTitle(`${group.name} - Members`);

    const handleEditMemberSubmit = (values, { setSubmitting }) => {
        dispatch(
            updateGroupMemberPrivileges({
                groupId,
                memberId: values.userId,
                permissions: { canWrite: values.canWrite, isOwner: values.isOwner },
                api,
            })
        )
            .unwrap()
            .then((result) => {
                setSubmitting(false);
                setMemberToEdit(undefined);
                toast.success("Successfully updated group member permissions");
            })
            .catch((err) => {
                setSubmitting(false);
                toast.error(err);
            });
    };

    const getMemberUsername = (member_id) => {
        const member = members.find((member) => member.userID === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const closeEditMemberModal = () => {
        setMemberToEdit(undefined);
    };

    const openEditMemberModal = (userID) => {
        const user = members.find((member) => member.userID === userID);
        // TODO: maybe deal with disappearing users in the list
        setMemberToEdit(user);
    };

    return (
        <MobilePaper>
            <List>
                {members.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="No Members" />
                    </ListItem>
                ) : (
                    members.map((member, index) => (
                        <ListItem key={index}>
                            <ListItemText
                                primary={
                                    <>
                                        <span style={{ marginRight: 5 }}>{member.username}</span>
                                        {member.isOwner ? (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label="owner"
                                                variant="outlined"
                                            />
                                        ) : member.canWrite ? (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label="editor"
                                                variant="outlined"
                                            />
                                        ) : null}
                                        {member.userID === currentUserId ? (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label="it's you"
                                            />
                                        ) : (
                                            ""
                                        )}
                                    </>
                                }
                                secondary={
                                    <>
                                        {member.invitedBy && (
                                            <small className="text-muted">
                                                invited by {getMemberUsername(member.invitedBy)}
                                                {", "}
                                            </small>
                                        )}
                                        <small className="text-muted">
                                            joined{" "}
                                            {DateTime.fromISO(member.joinedAt).toLocaleString(DateTime.DATETIME_FULL)}
                                        </small>
                                    </>
                                }
                            />
                            {permissions.isOwner || permissions.canWrite ? (
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => openEditMemberModal(member.userID)}>
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
            <Dialog open={memberToEdit !== undefined} onClose={closeEditMemberModal}>
                <DialogTitle>Edit Group Member</DialogTitle>
                <DialogContent>
                    <Formik
                        initialValues={{
                            userId: memberToEdit?.userID ?? -1,
                            isOwner: memberToEdit?.isOwner ?? false,
                            canWrite: memberToEdit?.canWrite ?? false,
                        }}
                        onSubmit={handleEditMemberSubmit}
                        enableReinitialize={true}
                    >
                        {({ values, handleBlur, handleChange, isSubmitting, setFieldValue }) => (
                            <Form>
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="canWrite"
                                            onBlur={handleBlur}
                                            onChange={(evt) => setFieldValue("canWrite", evt.target.checked)}
                                            checked={values.canWrite}
                                        />
                                    }
                                    label="Can Write"
                                />
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="isOwner"
                                            onBlur={handleBlur}
                                            onChange={(evt) => setFieldValue("isOwner", evt.target.checked)}
                                            checked={values.isOwner}
                                        />
                                    }
                                    label="Is Owner"
                                />

                                {isSubmitting && <LinearProgress />}
                                <DialogActions>
                                    <Button type="submit" color="primary">
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
        </MobilePaper>
    );
};

export default GroupMemberList;
