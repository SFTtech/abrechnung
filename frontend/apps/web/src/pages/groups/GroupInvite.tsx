import Loading from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { GroupPreview } from "@abrechnung/api";
import { Alert, Button, Grid, List, ListItem, ListItemText, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

export const GroupInvite: React.FC = () => {
    const [group, setGroup] = useState<GroupPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const navigate = useNavigate();
    const inviteToken = params["inviteToken"];

    useTitle("Abrechnung - Join Group");

    useEffect(() => {
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
        api.client.groups
            .joinGroup({ requestBody: { invite_token: inviteToken } })
            .then((value) => {
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
                        <h4>You have been invited to group {group.name}</h4>
                    </Typography>
                    <List>
                        <ListItem>
                            <ListItemText primary="Name" secondary={group.name} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Description" secondary={group.description} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Created At" secondary={group.created_at} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Invitation Description" secondary={group.invite_description} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Invitation Valid Until" secondary={group.invite_valid_until} />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Invitation Single Use"
                                secondary={group.invite_single_use ? "yes" : "no"}
                            />
                        </ListItem>
                    </List>
                    <Grid container={true} sx={{ justifyContent: "center" }}>
                        <Button color="primary" onClick={join}>
                            Join
                        </Button>
                    </Grid>
                </>
            )}
        </MobilePaper>
    );
};

export default GroupInvite;
