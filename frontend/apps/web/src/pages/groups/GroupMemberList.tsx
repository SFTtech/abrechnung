import { GroupMember } from "@abrechnung/api";
import {
    selectCurrentUserId,
    selectGroupMembers,
    updateGroupMemberPrivileges,
    useCurrentUserPermissions,
    useGroup,
} from "@abrechnung/redux";
import { Edit } from "@mui/icons-material";
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
import { Form, Formik, FormikHelpers } from "formik";
import { DateTime } from "luxon";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { MobilePaper } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";

interface Props {
    groupId: number;
}

type FormValues = {
    userId: number;
    isOwner: boolean;
    canWrite: boolean;
};

export const GroupMemberList: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const currentUserId = useAppSelector(selectCurrentUserId);
    const members = useAppSelector((state) => selectGroupMembers(state, groupId));
    const group = useGroup(groupId);
    const permissions = useCurrentUserPermissions(groupId);

    const [memberToEdit, setMemberToEdit] = useState<GroupMember | undefined>(undefined);

    useTitle(t("groups.memberList.tabTitle", "", { groupName: group?.name }));

    const handleEditMemberSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        dispatch(
            updateGroupMemberPrivileges({
                groupId,
                memberId: values.userId,
                permissions: { canWrite: values.canWrite, isOwner: values.isOwner },
                api,
            })
        )
            .unwrap()
            .then(() => {
                setSubmitting(false);
                setMemberToEdit(undefined);
                toast.success("Successfully updated group member permissions");
            })
            .catch((err) => {
                setSubmitting(false);
                toast.error(err);
            });
    };

    const getMemberUsername = (member_id: number) => {
        const member = members.find((member) => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const closeEditMemberModal = () => {
        setMemberToEdit(undefined);
    };

    const openEditMemberModal = (userID: number) => {
        const user = members.find((member) => member.user_id === userID);
        // TODO: maybe deal with disappearing users in the list
        setMemberToEdit(user);
    };

    if (!permissions) {
        return <Navigate to="/404" />;
    }

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
                                        {member.is_owner ? (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label={t("groups.memberList.owner")}
                                                variant="outlined"
                                            />
                                        ) : member.can_write ? (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label={t("groups.memberList.editor")}
                                                variant="outlined"
                                            />
                                        ) : null}
                                        {member.user_id === currentUserId && (
                                            <Chip
                                                size="small"
                                                sx={{ mr: 1 }}
                                                component="span"
                                                color="primary"
                                                label={t("groups.memberList.itsYou")}
                                            />
                                        )}
                                    </>
                                }
                                secondary={
                                    <>
                                        {member.invited_by && (
                                            <small className="text-muted">
                                                {t("groups.memberList.invitedBy", "", {
                                                    username: getMemberUsername(member.invited_by),
                                                })}
                                            </small>
                                        )}
                                        <small className="text-muted">
                                            {t("groups.memberList.joined", "", {
                                                datetime: DateTime.fromISO(member.joined_at).toLocaleString(
                                                    DateTime.DATETIME_FULL
                                                ),
                                            })}
                                        </small>
                                    </>
                                }
                            />
                            {(permissions.is_owner || permissions.can_write) && (
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => openEditMemberModal(member.user_id)}>
                                        <Edit />
                                    </IconButton>
                                </ListItemSecondaryAction>
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
                            userId: memberToEdit?.user_id ?? -1,
                            isOwner: memberToEdit?.is_owner ?? false,
                            canWrite: memberToEdit?.can_write ?? false,
                        }}
                        onSubmit={handleEditMemberSubmit}
                        enableReinitialize={true}
                    >
                        {({ values, handleBlur, isSubmitting, setFieldValue }) => (
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
                                    label={t("groups.memberList.canWrite")}
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
                                    label={t("groups.memberList.isOwner")}
                                />

                                {isSubmitting && <LinearProgress />}
                                <DialogActions>
                                    <Button type="submit" color="primary">
                                        {t("common.save")}
                                    </Button>
                                    <Button color="error" onClick={closeEditMemberModal}>
                                        {t("common.cancel")}
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
