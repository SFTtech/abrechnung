import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { groupList } from "../../recoil/groups";
import ListItemLink from "../../components/style/ListItemLink";
import GroupCreateModal from "../../components/groups/GroupCreateModal";
import GroupDeleteModal from "../../components/groups/GroupDeleteModal";
import {
    Grid,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    Typography,
} from "@mui/material";
import { Add, Delete } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupList() {
    const classes = useStyles();
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);
    const [showGroupDeletionModal, setShowGroupDeletionModal] = useState(false);
    const [groupToDelete, setGroupToDelete] = useState(null);
    const groups = useRecoilValue(groupList);

    const openGroupDeletionModal = (groupID) => {
        setGroupToDelete(groups.find((group) => group.id === groupID));
        setShowGroupDeletionModal(true);
    };

    const closeGroupDeletionModal = () => {
        setShowGroupDeletionModal(false);
        setGroupToDelete(null);
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Groups
            </Typography>
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
            <Grid container justifyContent="center">
                <IconButton color="primary" onClick={() => setShowGroupCreationModal(true)}>
                    <Add />
                </IconButton>
            </Grid>
            <GroupCreateModal show={showGroupCreationModal} onClose={() => setShowGroupCreationModal(false)} />
            <GroupDeleteModal
                show={showGroupDeletionModal}
                onClose={closeGroupDeletionModal}
                groupToDelete={groupToDelete}
            />
        </Paper>
    );
}
