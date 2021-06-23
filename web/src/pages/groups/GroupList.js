import React, {useState} from "react";
import {useRecoilValue} from "recoil";
import {groupList} from "../../recoil/groups";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemLink from "../../components/style/ListItemLink";
import IconButton from "@material-ui/core/IconButton";
import Delete from "@material-ui/icons/Delete";
import GroupCreateModal from "../../components/groups/GroupCreateModal";
import GroupDeleteModal from "../../components/groups/GroupDeleteModal";
import Grid from "@material-ui/core/Grid";
import Paper from "@material-ui/core/Paper";
import Add from "@material-ui/icons/Add";
import {makeStyles} from "@material-ui/core";

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
        setGroupToDelete(groups.find(group => group.group_id === groupID));
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
                    groups.map(group => {
                        return (
                            <ListItemLink key={group.group_id} to={`/groups/${group.group_id}`}>
                                <ListItemText primary={group.name} secondary={group.description}/>
                                <ListItemSecondaryAction>
                                    <IconButton edge="end" aria-label="delete-group"
                                                onClick={() => openGroupDeletionModal(group.group_id)}>
                                        <Delete/>
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItemLink>
                        );
                    })
                )}
            </List>
            <Grid container justify="center">
                <IconButton color="primary"
                            onClick={() => setShowGroupCreationModal(true)}>
                    <Add/>
                </IconButton>
            </Grid>
            <GroupCreateModal show={showGroupCreationModal} onClose={() => setShowGroupCreationModal(false)}/>
            <GroupDeleteModal show={showGroupDeletionModal} onClose={closeGroupDeletionModal}
                              groupToDelete={groupToDelete}/>
        </Paper>
    );
}
