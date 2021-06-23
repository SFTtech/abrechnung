import React, {useState} from "react";
import {useRecoilValue, useResetRecoilState} from "recoil";
import {deleteSession, renameSession, sessionToken, userSessions} from "../../recoil/auth";
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
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function SessionList() {
    const classes = useStyles();
    // TODO: fix editing functions
    let [editedSessions, setEditedSessions] = useState({});
    let [sessionToDelete, setSessionToDelete] = useState({show: false, toDelete: null});
    const sessions = useRecoilValue(userSessions);
    const authtoken = useRecoilValue(sessionToken);
    const reloadSessions = useResetRecoilState(userSessions);

    const editSession = (id) => {
        if (!editedSessions.hasOwnProperty(id)) {
            const newSessions = {...editedSessions, [id]: sessions.find(session => session.session_id === id)?.name};
            setEditedSessions(newSessions);
        }
    };

    const stopEditSession = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            let newEditedSessions = {...editedSessions};
            delete newEditedSessions[id];
            setEditedSessions(newEditedSessions);
        }
    };

    const closeDeleteSessionModal = () => {
        setSessionToDelete({show: false, toDelete: null});
    };

    const performRename = (id) => {
        if (editedSessions.hasOwnProperty(id)) {
            renameSession({
                authtoken: authtoken,
                sessionID: id,
                newName: editedSessions[id],
            }).then(result => {
                reloadSessions();
            })
            stopEditSession(id);
        }
    };

    const openDeleteSessionModal = (id) => {
        setSessionToDelete({show: true, toDelete: id});
    };

    const confirmDeleteSession = () => {
        if (sessionToDelete.toDelete !== null) {
            deleteSession({authtoken: authtoken, sessionID: sessionToDelete.toDelete})
                .then(result => {
                    reloadSessions();
                });
            setSessionToDelete({show: false, toDelete: null});
        }
    };

    const handleEditChange = (id, value) => {
        const newEditedSessions = {...editedSessions, [id]: value};
        setEditedSessions(newEditedSessions);
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Login Sessions
            </Typography>
            <List>
                {sessions.map((session) => {
                    if (editedSessions.hasOwnProperty(session.session_id)) {
                        return (
                            <ListItem key={session.session_id}>
                                <input
                                    type="text"
                                    value={editedSessions[session.session_id]}
                                    onChange={(event) => handleEditChange(session.session_id, event.target.value)}
                                />
                                <br/>
                                <small className="text-muted">Last seen: {session.last_seen}</small>
                                <ListItemSecondaryAction>
                                    <Button onClick={() => performRename(session.session_id)}>
                                        <Check/>
                                    </Button>
                                    <Button onClick={() => stopEditSession(session.session_id)}>
                                        <Close/>
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                        );
                    } else {
                        return (
                            <ListItem key={session.session_id}>
                                <ListItemText primary={session.name}
                                              secondary={`Last seen: ${session.last_seen}`}/>
                                <ListItemSecondaryAction>
                                    <IconButton onClick={() => editSession(session.session_id)}>
                                        <Edit/>
                                    </IconButton>
                                    <IconButton
                                        onClick={() => openDeleteSessionModal(session.session_id)}>
                                        <Delete/>
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
                            `Are you sure you want to delete session ${sessions.find(session => session.session_id === sessionToDelete.toDelete)?.name}`
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
