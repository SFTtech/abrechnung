import React, { useEffect, useState } from "react";
import { useHistory, useParams } from "react-router-dom";
import Loading from "../../components/style/Loading";
import { ListItem, ListItemText, makeStyles } from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import Alert from "@material-ui/lab/Alert";
import Paper from "@material-ui/core/Paper";
import { fetchGroupPreview, joinGroup } from "../../api";
import List from "@material-ui/core/List";
import Button from "@material-ui/core/Button";
import Grid from "@material-ui/core/Grid";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function GroupInvite() {
    const [group, setGroup] = useState(null);
    const [error, setError] = useState(null);
    const classes = useStyles();
    const history = useHistory();
    const { inviteToken } = useParams();

    useEffect(() => {
        fetchGroupPreview({ token: inviteToken })
            .then(res => {
                setGroup(res);
                setError(null);
            })
            .catch(err => {
                setError(err);
                setGroup(null);
            });
    }, [setGroup, setError, history, inviteToken]);

    const join = () => {
        console.log("joining group");
        joinGroup({ token: inviteToken })
            .then(value => {
                setError(null);
                history.push("/");
            })
            .catch(err => {
                setError(err);
            });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
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
                            <ListItemText primary="Invitation Single Use"
                                          secondary={group.invite_single_use ? "yes" : "no"} />
                        </ListItem>
                    </List>
                    <Grid container justify="center">
                        <Button color="primary"
                                onClick={join}>
                            Join
                        </Button>
                    </Grid>
                </>
            )}
        </Paper>
    );
}

