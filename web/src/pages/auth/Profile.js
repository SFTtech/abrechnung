import React from "react";
import { useRecoilValue } from "recoil";
import { userData } from "../../recoil/auth";
import { List, ListItem, ListItemText, Paper, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function Profile() {
    const classes = useStyles();
    const user = useRecoilValue(userData);

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Profile
            </Typography>
            <List>
                <ListItem>
                    <ListItemText primary="Username" secondary={user.username} />
                </ListItem>
                <ListItem>
                    <ListItemText primary="E-Mail" secondary={user.email} />
                </ListItem>
                <ListItem>
                    <ListItemText primary="Registered" secondary={user.registered_at} />
                </ListItem>
            </List>
        </Paper>
    );
}

