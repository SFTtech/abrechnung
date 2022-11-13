import React, { useState } from "react";
import { api } from "../../core/api";
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
    TextField,
    Typography,
} from "@mui/material";
import { Check, Close, Delete, Edit } from "@mui/icons-material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import { selectProfile } from "@abrechnung/redux";
import { useAppSelector, selectAuthSlice } from "../../store";
import Loading from "../../components/style/Loading";

export const SessionList: React.FC = () => {
    // TODO: fix editing functions
    const [editedSessions, setEditedSessions] = useState({});
    const [sessionToDelete, setSessionToDelete] = useState({
        show: false,
        toDelete: null,
    });
    const profile = useAppSelector((state) => selectProfile({ state: selectAuthSlice(state) }));

    useTitle("Abrechnung - Sessions");

    const editSession = (id) => {
        if (editedSessions[id] === undefined) {
            const newSessions = {
                ...editedSessions,
                [id]: profile?.sessions.find((session) => session.id === id)?.name,
            };
            setEditedSessions(newSessions);
        }
    };

    const stopEditSession = (id) => {
        if (editedSessions[id] !== undefined) {
            const newEditedSessions = { ...editedSessions };
            delete newEditedSessions[id];
            setEditedSessions(newEditedSessions);
        }
    };

    const closeDeleteSessionModal = () => {
        setSessionToDelete({ show: false, toDelete: null });
    };

    const performRename = (id) => {
        if (editedSessions[id] !== undefined) {
            api.renameSession(id, editedSessions[id]).catch((err) => {
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
            api.deleteSession(sessionToDelete.toDelete).catch((err) => {
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
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Login Sessions
            </Typography>
            {profile === undefined ? (
                <Loading />
            ) : (
                <List>
                    {profile.sessions.map((session) => {
                        if (editedSessions[session.id] !== undefined) {
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
                                                    {DateTime.fromISO(session.validUntil).toLocaleString(
                                                        DateTime.DATETIME_FULL
                                                    ) && "indefinitely"}
                                                    ,{" "}
                                                </span>
                                                <span>
                                                    Last seen on{" "}
                                                    {DateTime.fromISO(session.lastSeen).toLocaleString(
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
            )}
            <Dialog open={sessionToDelete.show} onClose={closeDeleteSessionModal}>
                <DialogTitle>Delete Session?</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        {sessionToDelete.toDelete !== null
                            ? `Are you sure you want to delete session ${
                                  profile?.sessions.find((session) => session.id === sessionToDelete.toDelete)?.name
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
        </MobilePaper>
    );
};

export default SessionList;
