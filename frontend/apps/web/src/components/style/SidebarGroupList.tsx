import { Grid, IconButton, List, ListItem, ListItemText } from "@mui/material";
import ListItemLink from "./ListItemLink";
import GroupCreateModal from "../groups/GroupCreateModal";
import React, { useState } from "react";
import { Add } from "@mui/icons-material";
import { selectGroups, selectIsGuestUser } from "@abrechnung/redux";
import { selectGroupSlice, useAppSelector, selectAuthSlice } from "../../store";

interface Props {
    activeGroupId?: number;
}

export const SidebarGroupList: React.FC<Props> = ({ activeGroupId }) => {
    const isGuest = useAppSelector((state) => selectIsGuestUser({ state: selectAuthSlice(state) }));
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);

    const openGroupCreateModal = () => {
        setShowGroupCreationModal(true);
    };

    const closeGroupCreateModal = (evt, reason) => {
        if (reason !== "backdropClick") {
            setShowGroupCreationModal(false);
        }
    };

    return (
        <>
            <List sx={{ pt: 0 }}>
                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemText secondary="Groups" />
                </ListItem>
                {groups.map((it) => (
                    <ListItemLink
                        key={it.id}
                        to={`/groups/${it.id}`}
                        selected={activeGroupId && activeGroupId === it.id}
                    >
                        <ListItemText primary={it.name} />
                    </ListItemLink>
                ))}
                {!isGuest && (
                    <ListItem sx={{ padding: 0 }}>
                        <Grid container justifyContent="center">
                            <IconButton size="small" onClick={openGroupCreateModal}>
                                <Add />
                            </IconButton>
                        </Grid>
                    </ListItem>
                )}
            </List>
            {!isGuest && <GroupCreateModal show={showGroupCreationModal} onClose={closeGroupCreateModal} />}
        </>
    );
};

export default SidebarGroupList;
