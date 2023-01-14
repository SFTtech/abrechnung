import React, { useState } from "react";
import ListItemLink from "../../components/style/ListItemLink";
import GroupCreateModal from "../../components/groups/GroupCreateModal";
import GroupDeleteModal from "../../components/groups/GroupDeleteModal";
import {
    Alert,
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { MobilePaper } from "../../components/style/mobile";
import { selectIsGuestUser, selectGroups } from "@abrechnung/redux";
import { useAppSelector, selectGroupSlice, selectAuthSlice } from "../../store";
import { useTitle } from "../../core/utils";

export const GroupList: React.FC = () => {
    useTitle("Abrechnung - Groups");
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const [showGroupDeletionModal, setShowGroupDeletionModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const groups = useAppSelector((state) => selectGroups({ state: selectGroupSlice(state) }));
    const isGuest = useAppSelector((state) => selectIsGuestUser({ state: selectAuthSlice(state) }));

    const openGroupDeletionModal = (groupID) => {
        setGroupToDelete(groups.find((group) => group.id === groupID));
        setShowGroupDeletionModal(true);
    };

    const closeGroupDeletionModal = () => {
        setShowGroupDeletionModal(false);
        setGroupToDelete(null);
    };

    const openGroupCreateModal = () => {
        setShowGroupCreationModal(true);
    };

    const closeGroupCreateModal = (evt, reason) => {
        if (reason !== "backdropClick") {
            setShowGroupCreationModal(false);
        }
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Groups
            </Typography>
            {isGuest && (
                <Alert severity="info">
                    You are a guest user on this Abrechnung and therefore not permitted to create new groups.
                </Alert>
            )}
            <List>
                {groups.length === 0 ? (
                    <ListItem key={0}>
                        <span>No Groups</span>
                    </ListItem>
                ) : (
                    groups.map((group) => {
                        return (
                            <ListItem sx={{ padding: 0 }} key={group.id}>
                                <ListItemLink to={`/groups/${group.id}`}>
                                    <ListItemText primary={group.name} secondary={group.description} />
                                </ListItemLink>
                                <ListItemSecondaryAction>
                                    <IconButton
                                        edge="end"
                                        aria-label="delete-group"
                                        onClick={() => openGroupDeletionModal(group.id)}
                                    >
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    })
                )}
            </List>
            {!isGuest && (
                <>
                    <Grid container justifyContent="center">
                        <IconButton color="primary" onClick={openGroupCreateModal}>
                            <Add />
                        </IconButton>
                    </Grid>
                    <GroupCreateModal show={showGroupCreationModal} onClose={closeGroupCreateModal} />
                </>
            )}
            <GroupDeleteModal
                show={showGroupDeletionModal}
                onClose={closeGroupDeletionModal}
                groupToDelete={groupToDelete}
            />
        </MobilePaper>
    );
};

export default GroupList;
