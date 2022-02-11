import React from "react";
import { useRecoilValue } from "recoil";
import { userData } from "../../recoil/auth";
import { List, ListItem, ListItemText, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";

export default function Profile() {
    const user = useRecoilValue(userData);

    return (
        <MobilePaper>
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
        </MobilePaper>
    );
}
