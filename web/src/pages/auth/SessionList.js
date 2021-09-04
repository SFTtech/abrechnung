import React, { useState } from "react";
import { useRecoilValue } from "recoil";
import { userData } from "../../recoil/auth";
import Typography from "@material-ui/core/Typography";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import IconButton from "@material-ui/core/IconButton";
import Edit from "@material-ui/icons/Edit";
import Delete from "@material-ui/icons/Delete";
import Dialog from "@material-ui/core/Dialog";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import Button from "@material-ui/core/Button";
import Close from "@material-ui/icons/Close";
import Check from "@material-ui/icons/Check";
import { makeStyles, TextField } from "@material-ui/core";
import { deleteSession, renameSession } from "../../api";
import { DateTime } from "luxon";
import { toast } from "react-toastify";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function SessionList() {
    const classes = useStyles();
    // TODO: fix editing functions
    const [editedSessions, setEditedSessions] = useState({});
    const [sessionToDelete, setSessionToDelete] = useState({ show: false, toDelete: null });
    const user = useRecoilValue(userData);
    const sessions = user.sessions;

    const editSession = (id) => {
        if (!editedSessions.hasOwnProperty(id)) {
            const newSessions = { ...editedSessions, [id]: sessions.find(session => session.id === id)?.name };
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
                name: editedSessions[id]
            }).catch(err => {
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
            deleteSession({ sessionID: sessionToDelete.toDelete })
                .catch(err => {
                    toast.error(err);
                });
            setSessionToDelete({ show: false, toDelete: null });
        }
    };

    const handleEditChange = (id, value) => {
        const newEditedSessions = { ...editedSessions, [id]: value };
        setEditedSessions(newEditedSessions);
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
                                    fullWidth
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
                                <ListItemText primary={session.name}
                                              secondary={(
                                                  <>
                                                      <span>Valid until {DateTime.fromISO(session.valid_until).toLocaleString(DateTime.DATETIME_FULL) && "indefinitely"}, </span>
                                                      <span>Last seen on {DateTime.fromISO(session.last_seen).toLocaleString(DateTime.DATETIME_FULL)}</span>
                                                  </>
                                              )} />
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => editSession(session.id)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton
                                        onClick={() => openDeleteSessionModal(session.id)}>
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
                        {sessionToDelete.toDelete !== null ? (
                            `Are you sure you want to delete session ${sessions.find(session => session.id === sessionToDelete.toDelete)?.name}`
                        ) : null}
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
