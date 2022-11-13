import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Loading from "../../components/style/Loading";
import { api } from "../../core/api";
import { List, Button, Grid, ListItem, ListItemText, Typography, Alert } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import { GroupPreview } from "@abrechnung/types";

export const GroupInvite: React.FC = () => {
    const [group, setGroup] = useState<GroupPreview | null>(null);
    const [error, setError] = useState<string | null>(null);
    const params = useParams();
    const navigate = useNavigate();
    const inviteToken = params["inviteToken"];

    useTitle("Abrechnung - Join Group");

    useEffect(() => {
        api.fetchGroupPreview(inviteToken)
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
        api.joinGroup(inviteToken)
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
                            <ListItemText primary="Created At" secondary={group.createdAt} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Invitation Description" secondary={group.inviteDescription} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="Invitation Valid Until" secondary={group.inviteValidUntil} />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Invitation Single Use"
                                secondary={group.inviteSingleUse ? "yes" : "no"}
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
