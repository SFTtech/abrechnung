import Loading from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { GroupPreview } from "@abrechnung/api";
import { Alert, Button, Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";

export const GroupInvite: React.FC = () => {
    const { t } = useTranslation();
    const [group, setGroup] = useState<GroupPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const { inviteToken } = useParams();
    const navigate = useNavigate();

    useTitle(t("groups.join.tabTitle"));

    useEffect(() => {
        if (!inviteToken) {
            return;
        }
        api.client.groups
            .previewGroup({ requestBody: { invite_token: inviteToken } })
            .then((res) => {
                setGroup(res);
                setError(null);
            })
            .catch((err) => {
                setError(err);
                setGroup(null);
            });
    }, [setGroup, setError, inviteToken]);

    const join = () => {
        if (!inviteToken) {
            return;
        }
        api.client.groups
            .joinGroup({ requestBody: { invite_token: inviteToken } })
            .then(() => {
                setError(null);
                navigate("/");
            })
            .catch((err) => {
                setError(err);
            });
    };

    return (
        <MobilePaper>
            {error !== null ? (
                <Alert severity="error">{error}</Alert>
            ) : group === null ? (
                <Loading />
            ) : (
                <>
                    <Typography variant="h5">
                        <h4>{t("groups.join.youHaveBeenInvited", "", { group })}</h4>
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemText primary={t("common.name")} secondary={group.name} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary={t("common.description")} secondary={group.description} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary={t("common.createdAt")} secondary={group.created_at} />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary={t("groups.join.invitationDescription")}
                                secondary={group.invite_description}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary={t("groups.join.invitationValidUntil")}
                                secondary={group.invite_valid_until}
                            />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary={t("groups.join.invitationSingleUse")}
                                secondary={group.invite_single_use ? "yes" : "no"}
                            />
                        </ListItem>
                    </List>
                    <Grid container={true} sx={{ justifyContent: "center" }}>
                        <Button color="primary" onClick={join}>
                            {t("groups.join.join")}
                        </Button>
                    </Grid>
                </>
            )}
        </MobilePaper>
    );
};
