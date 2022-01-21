import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { userData } from "../../recoil/auth";
import { deleteSession, renameSession } from "../../api";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    IconButton,
    List,
    ListItem,
    ListItemSecondaryAction,
    ListItemText,
    Paper,
    TextField,
    Typography,
} from "@mui/material";
import { Check, Close, Delete, Edit } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function SessionList() {
    const classes = useStyles();
    // TODO: fix editing functions
    const [editedSessions, setEditedSessions] = useState({});
    const [sessionToDelete, setSessionToDelete] = useState({
        show: false,
        toDelete: null,
    });
    const user = useRecoilValue(userData);
    const sessions = user.sessions;

    const editSession = (id) => {
        if (!editedSessions.hasOwnProperty(id)) {
            const newSessions = {
                ...editedSessions,
                [id]: sessions.find((session) => session.id === id)?.name,
            };
            setEditedSessions(newSessions);
        }
    };

    const stopEditSession = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            let newEditedSessions = { ...editedSessions };
            delete newEditedSessions[id];
            setEditedSessions(newEditedSessions);
        }
    };

    const closeDeleteSessionModal = () => {
        setSessionToDelete({ show: false, toDelete: null });
    };

    const performRename = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            renameSession({
                sessionID: id,
                name: editedSessions[id],
            }).catch((err) => {
                toast.error(err);
            });
            stopEditSession(id);
        }
    };

    const openDeleteSessionModal = (id) => {
        setSessionToDelete({ show: true, toDelete: id });
    };

    const confirmDeleteSession = () => {
        if (sessionToDelete.toDelete !== null) {
            deleteSession({ sessionID: sessionToDelete.toDelete }).catch((err) => {
                toast.error(err);
            });
            setSessionToDelete({ show: false, toDelete: null });
        }
    };

    const handleEditChange = (id, value) => {
        const newEditedSessions = { ...editedSessions, [id]: value };
        setEditedSessions(newEditedSessions);
    };

    const onKeyUp = (id) => (key) => {
        if (key.keyCode === 13) {
            performRename(id);
        }
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Login Sessions
            </Typography>
            <List>
                {sessions.map((session) => {
                    if (editedSessions.hasOwnProperty(session.id)) {
                        return (
                            <ListItem key={session.id}>
                                <TextField
                                    margin="normal"
                                    variant="standard"
                                    fullWidth
                                    onKeyUp={onKeyUp(session.id)}
                                    value={editedSessions[session.id]}
                                    onChange={(event) => handleEditChange(session.id, event.target.value)}
                                />
                                <ListItemSecondaryAction>
                                    <Button onClick={() => performRename(session.id)}>
                                        <Check />
                                    </Button>
                                    <Button onClick={() => stopEditSession(session.id)}>
                                        <Close />
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    } else {
                        return (
                            <ListItem key={session.id}>
                                <ListItemText
                                    primary={session.name}
                                    secondary={
                                        <>
                                            <span>
                                                Valid until{" "}
                                                {DateTime.fromISO(session.valid_until).toLocaleString(
                                                    DateTime.DATETIME_FULL
                                                ) && "indefinitely"}
                                                ,{" "}
                                            </span>
                                            <span>
                                                Last seen on{" "}
                                                {DateTime.fromISO(session.last_seen).toLocaleString(
                                                    DateTime.DATETIME_FULL
                                                )}
                                            </span>
                                        </>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => editSession(session.id)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton onClick={() => openDeleteSessionModal(session.id)}>
                                        <Delete />
                                    </IconButton>
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    }
                })}
            </List>
            <Dialog open={sessionToDelete.show} onClose={closeDeleteSessionModal}>
                <DialogTitle>Delete Session?</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        {sessionToDelete.toDelete !== null
                            ? `Are you sure you want to delete session ${
                                  sessions.find((session) => session.id === sessionToDelete.toDelete)?.name
                              }`
                            : null}
                    </DialogContentText>
                </DialogContent>

                <DialogActions>
                    <Button color="secondary" onClick={confirmDeleteSession}>
                        Yes pls
                    </Button>
                    <Button color="primary" onClick={closeDeleteSessionModal}>
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </Paper>
    );
}
