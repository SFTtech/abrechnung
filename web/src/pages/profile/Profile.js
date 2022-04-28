import React from "react";
import { useRecoilValue } from "recoil";
import { isGuestUser, userData } from "../../recoil/auth";
import { Alert, List, ListItem, ListItemText, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../utils";
import { DateTime } from "luxon";

export default function Profile() {
    const user = useRecoilValue(userData);
    const isGuest = useRecoilValue(isGuestUser);
    useTitle("Abrechnung - Profile");

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Profile
            </Typography>
            {isGuest && (
                <Alert severity="info">
                    You are a guest user on this Abrechnung and therefore not permitted to create new groups or group
                    invites.
                </Alert>
            )}
            <List>
                <ListItem>
                    <ListItemText primary="Username" secondary={user.username} />
                </ListItem>
                <ListItem>
                    <ListItemText primary="E-Mail" secondary={user.email} />
                </ListItem>
                <ListItem>
                    <ListItemText
                        primary="Registered"
                        secondary={DateTime.fromISO(user.registered_at).toLocaleString(DateTime.DATETIME_FULL)}
                    />
                </ListItem>
            </List>
        </MobilePaper>
    );
}
