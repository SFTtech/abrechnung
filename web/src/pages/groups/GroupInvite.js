import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import Loading from "../../components/style/Loading";
import { fetchGroupPreview, joinGroup } from "../../api";
import { List, Button, Grid, ListItem, ListItemText, Typography } from "@mui/material";
import { Alert } from "@mui/lab";
import { MobilePaper } from "../../components/style/mobile";

export default function GroupInvite() {
    const [group, setGroup] = useState(null);
    const [error, setError] = useState(null);
    const history = useHistory();
    const { inviteToken } = useParams();

    useEffect(() => {
        fetchGroupPreview({ token: inviteToken })
            .then((res) => {
                setGroup(res);
                setError(null);
            })
            .catch((err) => {
                setError(err);
                setGroup(null);
            });
    }, [setGroup, setError, history, inviteToken]);

    const join = () => {
        joinGroup({ token: inviteToken })
            .then((value) => {
                setError(null);
                history.push("/");
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
                    <Grid container justify="center">
                        <Button color="primary" onClick={join}>
                            Join
                        </Button>
                    </Grid>
                </>
            )}
        </MobilePaper>
    );
}
