import { Group, GroupMember } from "@abrechnung/api";
import {
    selectCurrentUserId,
    selectGroupMembers,
    updateGroupMemberPrivileges,
    useCurrentUserPermissions,
} from "@abrechnung/redux";
import { Edit } from "@mui/icons-material";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemText,
} from "@mui/material";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { useAppDispatch, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router";
import { useForm } from "react-hook-form";
import { FormCheckbox } from "@abrechnung/components";
import { useFormatDatetime } from "@/hooks";

interface GroupMemberListProps {
    group: Group;
}

type FormValues = {
    userId: number;
    isOwner: boolean;
    canWrite: boolean;
};

const EditMemberDialog: React.FC<{
    group: Group;
    memberToEdit: GroupMember | undefined;
    setMemberToEdit: (member: GroupMember | undefined) => void;
}> = ({ group, memberToEdit, setMemberToEdit }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const closeEditMemberModal = () => {
        setMemberToEdit(undefined);
    };

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormValues>({
        defaultValues: {
            userId: memberToEdit?.user_id ?? -1,
            isOwner: memberToEdit?.is_owner ?? false,
            canWrite: memberToEdit?.can_write ?? false,
        },
    });

    React.useEffect(() => {
        resetForm({
            userId: memberToEdit?.user_id ?? -1,
            isOwner: memberToEdit?.is_owner ?? false,
            canWrite: memberToEdit?.can_write ?? false,
        });
    }, [memberToEdit, resetForm]);

    const handleEditMemberSubmit = (values: FormValues) => {
        dispatch(
            updateGroupMemberPrivileges({
                groupId: group.id,
                memberId: values.userId,
                permissions: { canWrite: values.canWrite, isOwner: values.isOwner },
                api,
            })
        )
            .unwrap()
            .then(() => {
                closeEditMemberModal();
                toast.success("Successfully updated group member permissions");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={memberToEdit !== undefined} onClose={closeEditMemberModal}>
            <DialogTitle>Edit Group Member</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit(handleEditMemberSubmit)}>
                    <FormCheckbox name="canWrite" label={t("groups.memberList.canWrite")} control={control} />
                    <FormCheckbox name="isOwner" label={t("groups.memberList.isOwner")} control={control} />

                    <DialogActions>
                        <Button type="submit" color="primary">
                            {t("common.save")}
                        </Button>
                        <Button color="error" onClick={closeEditMemberModal}>
                            {t("common.cancel")}
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export const GroupMemberList: React.FC<GroupMemberListProps> = ({ group }) => {
    const { t } = useTranslation();
    const currentUserId = useAppSelector(selectCurrentUserId);
    const members = useAppSelector((state) => selectGroupMembers(state, group.id));
    const permissions = useCurrentUserPermissions(group.id);
    const formatDatetime = useFormatDatetime();

    const [memberToEdit, setMemberToEdit] = useState<GroupMember | undefined>(undefined);

    useTitle(t("groups.memberList.tabTitle", { groupName: group?.name }));

    const getMemberUsername = (member_id: number) => {
        const member = members.find((member) => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
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
        <>
            <List>
                {members.length === 0 ? (
                    <ListItem>
                        <ListItemText primary="No Members" />
                    </ListItem>
                ) : (
                    members.map((member, index) => (
                        <ListItem
                            key={index}
                            secondaryAction={
                                (permissions.is_owner || permissions.can_write) && (
                                    <IconButton color="primary" onClick={() => openEditMemberModal(member.user_id)}>
                                        <Edit />
                                    </IconButton>
                                )
                            }
                        >
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
                                                {t("groups.memberList.invitedBy", {
                                                    username: getMemberUsername(member.invited_by),
                                                })}
                                            </small>
                                        )}
                                        <small className="text-muted">
                                            {t("groups.memberList.joined", {
                                                datetime: formatDatetime(member.joined_at, "full"),
                                            })}
                                        </small>
                                    </>
                                }
                            />
                        </ListItem>
                    ))
                )}
            </List>
            <EditMemberDialog group={group} memberToEdit={memberToEdit} setMemberToEdit={setMemberToEdit} />
        </>
    );
};
