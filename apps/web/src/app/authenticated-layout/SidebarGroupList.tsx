import { GroupCreateModal } from "@/components/groups/GroupCreateModal";
import { ListItemLink } from "@/components/style";
import { useAppSelector } from "@/store";
import { selectGroups, selectIsGuestUser } from "@abrechnung/redux";
import { Add } from "@mui/icons-material";
import { IconButton, List, ListItem, ListItemText, Tooltip } from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";

interface Props {
    activeGroupId?: number;
}

export const SidebarGroupList: React.FC<Props> = ({ activeGroupId }) => {
    const { t } = useTranslation();
    const isGuest = useAppSelector(selectIsGuestUser);
    const groups = useAppSelector((state) => selectGroups(state, false));
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);

    const openGroupCreateModal = () => {
        setShowGroupCreationModal(true);
    };

    const closeGroupCreateModal = (reason: string) => {
        if (reason !== "backdropClick") {
            setShowGroupCreationModal(false);
        }
    };

    return (
        <>
            <List sx={{ pt: 0 }}>
                <ListItemLink to="/" sx={{ pt: 0, pb: 0 }}>
                    <ListItemText secondary={t("groups.list.header")} />
                </ListItemLink>
                {groups.map((it) => (
                    <ListItemLink
                        key={it.id}
                        to={`/groups/${it.id}`}
                        selected={activeGroupId != null && activeGroupId === it.id}
                    >
                        <ListItemText primary={it.name} />
                    </ListItemLink>
                ))}
                {!isGuest && (
                    <ListItem sx={{ justifyContent: "center" }}>
                        <Tooltip title={t("groups.addGroup")}>
                            <IconButton size="small" onClick={openGroupCreateModal}>
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </ListItem>
                )}
            </List>
            {!isGuest && <GroupCreateModal show={showGroupCreationModal} onClose={closeGroupCreateModal} />}
        </>
    );
};
