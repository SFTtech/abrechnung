import { selectProfile } from "@abrechnung/redux";
import { Check, Close, Delete, Edit } from "@mui/icons-material";
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
import { DateTime } from "luxon";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { MobilePaper, Loading } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { selectAuthSlice, useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";

export const SessionList: React.FC = () => {
    const { t } = useTranslation();
    // TODO: fix editing functions
    const [editedSessions, setEditedSessions] = useState<Record<number, string>>({});
    const [sessionToDelete, setSessionToDelete] = useState<{ show: boolean; toDelete: number | null }>({
        show: false,
        toDelete: null,
    });
    const profile = useAppSelector((state) => selectProfile({ state: selectAuthSlice(state) }));

    useTitle(t("profile.sessions.tabTitle"));

    const editSession = (id: number) => {
        if (editedSessions[id] === undefined) {
            const sessionName = profile?.sessions.find((session) => session.id === id)?.name;
            const newSessions = {
                ...editedSessions,
            };
            if (sessionName) {
                newSessions[id] = sessionName;
            }
            setEditedSessions(newSessions);
        }
    };

    const stopEditSession = (id: number) => {
        if (editedSessions[id] !== undefined) {
            const newEditedSessions = { ...editedSessions };
            delete newEditedSessions[id];
            setEditedSessions(newEditedSessions);
        }
    };

    const closeDeleteSessionModal = () => {
        setSessionToDelete({ show: false, toDelete: null });
    };

    const performRename = (id: number) => {
        if (editedSessions[id] !== undefined) {
            api.client.auth
                .renameSession({ requestBody: { session_id: id, name: editedSessions[id] } })
                .catch((err) => {
                    toast.error(err);
                });
            stopEditSession(id);
        }
    };

    const openDeleteSessionModal = (id: number) => {
        setSessionToDelete({ show: true, toDelete: id });
    };

    const confirmDeleteSession = () => {
        if (sessionToDelete.toDelete !== null) {
            api.client.auth.deleteSession({ requestBody: { session_id: sessionToDelete.toDelete } }).catch((err) => {
                toast.error(err);
            });
            setSessionToDelete({ show: false, toDelete: null });
        }
    };

    const handleEditChange = (id: number, value: string) => {
        const newEditedSessions = { ...editedSessions, [id]: value };
        setEditedSessions(newEditedSessions);
    };

    const onKeyUp = (id: number) => (key: React.KeyboardEvent) => {
        if (key.keyCode === 13) {
            performRename(id);
        }
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("profile.sessions.header")}
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
                                                {session.valid_until != null && (
                                                    <span>
                                                        Valid until{" "}
                                                        {DateTime.fromISO(session.valid_until).toLocaleString(
                                                            DateTime.DATETIME_FULL
                                                        ) && "indefinitely"}
                                                        ,{" "}
                                                    </span>
                                                )}
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
            )}
            <Dialog open={sessionToDelete.show} onClose={closeDeleteSessionModal}>
                <DialogTitle>{t("profile.sessions.confirmDeleteSession")}</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        {sessionToDelete.toDelete !== null
                            ? t("profile.sessions.areYouSureToDelete", "", {
                                  sessionName: profile?.sessions.find(
                                      (session) => session.id === sessionToDelete.toDelete
                                  )?.name,
                              })
                            : null}
                    </DialogContentText>
                </DialogContent>

                <DialogActions>
                    <Button color="secondary" onClick={confirmDeleteSession}>
                        {t("common.yes")}
                    </Button>
                    <Button color="primary" onClick={closeDeleteSessionModal}>
                        {t("common.no")}
                    </Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
};
