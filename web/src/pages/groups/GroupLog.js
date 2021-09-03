import React, {useState} from "react";
import {useRecoilValue} from "recoil";
import {groupLog, groupMembers} from "../../recoil/groups";
import Switch from "@material-ui/core/Switch";
import List from "@material-ui/core/List";
import Button from "@material-ui/core/Button";
import ListItem from "@material-ui/core/ListItem";
import TextField from "@material-ui/core/TextField";
import ListItemText from "@material-ui/core/ListItemText";
import Divider from "@material-ui/core/Divider";
import Typography from "@material-ui/core/Typography";
import {FormControlLabel, makeStyles, Paper} from "@material-ui/core";
import {sendGroupMessage} from "../../api";
import {toast} from "react-toastify";
import {DateTime} from "luxon";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function GroupLog({group}) {
    const classes = useStyles();
    const [message, setMessage] = useState("");
    const [showAllLogs, setShowAllLogs] = useState(false);
    const logEntries = useRecoilValue(groupLog(group.id));
    const members = useRecoilValue(groupMembers(group.id));

    const sendMessage = (e) => {
        e.preventDefault();
        sendGroupMessage({
            groupID: group.id,
            message: message,
        }).then(result => {
            setMessage("");
        }).catch(err => {
            toast.error(err);
        })
    }

    const log = showAllLogs
        ? logEntries
        : logEntries.filter((entry) => entry.type === "text-message");

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Group Log
            </Typography>
            <FormControlLabel control={
                <Switch
                    name="showAllLogs"
                    checked={showAllLogs}
                    color="primary"
                    onChange={e => setShowAllLogs(e.target.checked)}
                />
            } label="Show all Logs"/>
            <form onSubmit={sendMessage}>
                <TextField
                    required
                    fullWidth
                    name="newMessage"
                    placeholder="Write a message to the group ..."
                    value={message}
                    variant="outlined"
                    multiline
                    onChange={(e) => setMessage(e.target.value)}
                />
                <Button type="submit" color="primary" onClick={sendMessage}>
                    Send
                </Button>
            </form>
            <Divider variant="middle"/>
            <List>
                {log.map((logEntry) => (
                    <ListItem key={logEntry.id}>
                        <ListItemText
                            primary={logEntry.message === "" ? logEntry.type : logEntry.message}
                            secondary={`by ${members.find((member) => member.user_id === logEntry.user_id).username} 
                            on ${DateTime.fromISO(logEntry.logged_at).toLocaleString(DateTime.DATETIME_FULL)}`}/>
                    </ListItem>
                ))}
            </List>
        </Paper>
    );
}
