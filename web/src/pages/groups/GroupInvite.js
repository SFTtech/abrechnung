import React, {useEffect, useState} from "react";
import {Link as RouterLink, useHistory, useRouteMatch} from "react-router-dom";

import {ws} from "../../websocket";
import {useRecoilValue} from "recoil";
import {fetchToken, isAuthenticated} from "../../recoil/auth";
import Loading from "../../components/style/Loading";
import {makeStyles} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import Alert from "@material-ui/lab/Alert";
import List from "@material-ui/core/List";
import ListItem from "@material-ui/core/ListItem";
import ListItemSecondaryAction from "@material-ui/core/ListItemSecondaryAction";
import ListItemText from "@material-ui/core/ListItemText";
import Paper from "@material-ui/core/Paper";
import ClearIcon from "@material-ui/icons/Clear";
import CheckIcon from "@material-ui/icons/Check";
import Grid from "@material-ui/core/Grid";
import Button from "@material-ui/core/Button";
import Link from "@material-ui/core/Link";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupInvite() {
    const [group, setGroup] = useState(null);
    const [status, setStatus] = useState("loading");
    const [error, setError] = useState(null);
    const classes = useStyles();
    const history = useHistory();
    const match = useRouteMatch();
    const loggedIn = useRecoilValue(isAuthenticated);

    useEffect(() => {
        setStatus("loading");
        ws.call("group_preview", {
            invite_token: match.params.inviteToken,
        })
            .then((value) => {
                setGroup(value[0]);
                setError(null);
                setStatus("success");
            })
            .catch((error) => {
                setError(error)
                setStatus("failed");
            });
    }, [setGroup, setStatus, setError, history, match]);

    const join = () => {
        console.log("joining group");
        ws.call("group_join", {
            authtoken: fetchToken(),
            invite_token: match.params.inviteToken,
        })
            .then((value) => {
                setStatus("success");
                setError(null);
                history.push("/");
            })
            .catch((error) => {
                setStatus("failed");
                setError(error)
            });
    };

    if (status === "loading") {
        return (
            <Loading/>
        )
    }

    return (
        <Paper elevation={1} className={classes.paper}>
            {error !== null ? <Alert severity="error">{error}</Alert> : ""}
            <Typography variant="h5">
                <h4>You have been invited to group {group.group_name}</h4>
            </Typography>
            <List>
                <ListItem>
                    <ListItemText primary="Name" secondary={group.group_name}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Description" secondary={group.group_description}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Created At" secondary={group.group_created}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Invitation Description" secondary={group.invite_description}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Invitation Valid Until" secondary={group.invite_valid_until}/>
                </ListItem>
                <ListItem>
                    <ListItemText primary="Invitation Single Use"/>
                    <ListItemSecondaryAction>
                        {group.invite_single_use ? (
                            <CheckIcon/>
                        ) : (
                            <ClearIcon/>
                        )}
                    </ListItemSecondaryAction>
                </ListItem>
            </List>
            <Grid container justify="center">
                {loggedIn ? (
                    <Button color="primary"
                            onClick={join}>
                        Join
                    </Button>
                ) : (
                    <Link component={<RouterLink/>} to={"/login?next=" + match.url}>Join</Link>
                )}
            </Grid>
        </Paper>
    );
}

