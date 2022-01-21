import { useRecoilValue } from "recoil";
import { Grid, IconButton, List, ListItem, ListItemText } from "@mui/material";
import { groupList } from "../../recoil/groups";
import ListItemLink from "./ListItemLink";
import GroupCreateModal from "../groups/GroupCreateModal";
import React, { useState } from "react";
import { Add } from "@mui/icons-material";

export default function SidebarGroupList({ group = null }) {
    const groups = useRecoilValue(groupList);
    const [showGroupCreationModal, setShowGroupCreationModal] = useState(false);

    return (
        <>
            <List sx={{ pt: 0 }}>
                <ListItem sx={{ pt: 0, pb: 0 }}>
                    <ListItemText secondary="Groups" />
                </ListItem>
                {groups.map((it) => (
                    <ListItemLink key={it.id} to={`/groups/${it.id}`} selected={group && group.id === it.id}>
                        <ListItemText primary={it.name} />
                    </ListItemLink>
                ))}
                <ListItem sx={{ padding: 0 }}>
                    <Grid container justifyContent="center">
                        <IconButton size="small" onClick={() => setShowGroupCreationModal(true)}>
                            <Add />
                        </IconButton>
                    </Grid>
                </ListItem>
            </List>
            <GroupCreateModal show={showGroupCreationModal} onClose={() => setShowGroupCreationModal(false)} />
        </>
    );
}
