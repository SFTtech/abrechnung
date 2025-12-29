import { Group, GroupMember } from "@abrechnung/api";
import { selectCurrentUserId } from "@abrechnung/redux";
import { Edit } from "@mui/icons-material";
import {
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemText,
    Stack,
} from "@mui/material";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { FormCheckbox, Loading } from "@abrechnung/components";
import { useFormatDatetime } from "@/hooks";
import { useListMembersQuery, useUpdateMemberPermissionsMutation } from "@/core/generated/api";

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
    const [updateMember] = useUpdateMemberPermissionsMutation();

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
        updateMember({
            groupId: group.id,
            userId: values.userId,
            updateGroupMemberPermissionsPayload: {
                can_write: values.canWrite,
                is_owner: values.isOwner,
            },
        })
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
            <DialogTitle>{t("groups.memberList.editGroupMember")}</DialogTitle>
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
    const { data: members } = useListMembersQuery({ groupId: group.id });
    const formatDatetime = useFormatDatetime();

    const [memberToEdit, setMemberToEdit] = useState<GroupMember | undefined>(undefined);

    useTitle(t("groups.memberList.tabTitle", { groupName: group?.name }));

    const getMemberUsername = (member_id: number) => {
        const member = members?.find((member) => member.user_id === member_id);
        if (member === undefined) {
            return "unknown";
        }
        return member.username;
    };

    const openEditMemberModal = (member: GroupMember) => {
        setMemberToEdit(member);
    };

    if (members == null) {
        return <Loading />;
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
                        <div key={index}>
                            <ListItem
                                secondaryAction={
                                    (group.is_owner || group.can_write) && (
                                        <IconButton color="primary" onClick={() => openEditMemberModal(member)}>
                                            <Edit />
                                        </IconButton>
                                    )
                                }
                            >
                                <ListItemText
                                    primary={
                                        <Stack spacing={1} direction="row">
                                            <span>{member.username}</span>
                                            {member.is_owner ? (
                                                <Chip
                                                    size="small"
                                                    component="span"
                                                    color="primary"
                                                    label={t("groups.memberList.owner")}
                                                    variant="outlined"
                                                />
                                            ) : member.can_write ? (
                                                <Chip
                                                    size="small"
                                                    component="span"
                                                    color="primary"
                                                    label={t("groups.memberList.editor")}
                                                    variant="outlined"
                                                />
                                            ) : null}
                                            {member.user_id === currentUserId && (
                                                <Chip
                                                    size="small"
                                                    component="span"
                                                    color="primary"
                                                    label={t("groups.memberList.itsYou")}
                                                />
                                            )}
                                        </Stack>
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
                            <Divider sx={{ display: { lg: "none" } }} component="li" />
                        </div>
                    ))
                )}
            </List>
            <EditMemberDialog group={group} memberToEdit={memberToEdit} setMemberToEdit={setMemberToEdit} />
        </>
    );
};
