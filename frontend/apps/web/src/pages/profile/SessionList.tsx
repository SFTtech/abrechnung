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
    ListItemText,
    TextField,
    Typography,
} from "@mui/material";
import React, { useState } from "react";
import { toast } from "react-toastify";
import { MobilePaper } from "@/components/style";
import { Loading } from "@abrechnung/components";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { useFormatDatetime } from "@/hooks";
import { Session } from "@abrechnung/api";

export const SessionList: React.FC = () => {
    const { t } = useTranslation();
    // TODO: fix editing functions
    const [editedSessions, setEditedSessions] = useState<Record<number, string>>({});
    const [sessionToDelete, setSessionToDelete] = useState<Session | null>(null);
    const formatDatetime = useFormatDatetime();
    const profile = useAppSelector(selectProfile);

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
        setSessionToDelete(null);
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

    const openDeleteSessionModal = (session: Session) => {
        setSessionToDelete(session);
    };

    const confirmDeleteSession = () => {
        if (sessionToDelete !== null) {
            api.client.auth.deleteSession({ requestBody: { session_id: sessionToDelete.id } }).catch((err) => {
                toast.error(err);
            });
            setSessionToDelete(null);
        }
    };

    const handleEditChange = (id: number, value: string) => {
        const newEditedSessions = { ...editedSessions, [id]: value };
        setEditedSessions(newEditedSessions);
    };

    const onKeyUp = (id: number) => (key: React.KeyboardEvent) => {
        if (key.code === "Enter") {
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
                                <ListItem
                                    key={session.id}
                                    secondaryAction={
                                        <>
                                            <Button onClick={() => performRename(session.id)}>
                                                <Check />
                                            </Button>
                                            <Button onClick={() => stopEditSession(session.id)}>
                                                <Close />
                                            </Button>
                                        </>
                                    }
                                >
                                    <TextField
                                        margin="normal"
                                        variant="standard"
                                        fullWidth
                                        onKeyUp={onKeyUp(session.id)}
                                        value={editedSessions[session.id]}
                                        onChange={(event) => handleEditChange(session.id, event.target.value)}
                                    />
                                </ListItem>
                            );
                        } else {
                            return (
                                <ListItem
                                    key={session.id}
                                    secondaryAction={
                                        <>
                                            <IconButton color="primary" onClick={() => editSession(session.id)}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton color="error" onClick={() => openDeleteSessionModal(session)}>
                                                <Delete />
                                            </IconButton>
                                        </>
                                    }
                                >
                                    <ListItemText
                                        primary={session.name}
                                        secondary={
                                            <>
                                                {session.valid_until != null && (
                                                    <span>
                                                        {t("profile.sessions.validUntil", {
                                                            datetime: formatDatetime(session.valid_until, "full"),
                                                        })}
                                                    </span>
                                                )}
                                                <span>
                                                    {t("profile.sessions.lastSeenOn", {
                                                        datetime: formatDatetime(session.last_seen, "full"),
                                                    })}
                                                </span>
                                            </>
                                        }
                                    />
                                </ListItem>
                            );
                        }
                    })}
                </List>
            )}
            <Dialog open={sessionToDelete != null} onClose={closeDeleteSessionModal}>
                <DialogTitle>{t("profile.sessions.confirmDeleteSession")}</DialogTitle>

                <DialogContent>
                    <DialogContentText>
                        {t("profile.sessions.areYouSureToDelete", {
                            sessionName: sessionToDelete?.name ?? "",
                        })}
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
