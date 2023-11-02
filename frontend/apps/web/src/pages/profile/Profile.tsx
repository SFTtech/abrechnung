import Loading from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import { selectAuthSlice, useAppSelector } from "@/store";
import { selectProfile } from "@abrechnung/redux";
import { Alert, List, ListItem, ListItemText, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";

export const Profile: React.FC = () => {
    const profile = useAppSelector((state) => selectProfile({ state: selectAuthSlice(state) }));
    useTitle("Abrechnung - Profile");

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Profile
            </Typography>
            {profile === undefined ? (
                <Loading />
            ) : (
                <>
                    {profile.is_guest_user && (
                        <Alert severity="info">
                            You are a guest user on this Abrechnung and therefore not permitted to create new groups or
                            group invites.
                        </Alert>
                    )}
                    <List>
                        <ListItem>
                            <ListItemText primary="Username" secondary={profile.username} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary="E-Mail" secondary={profile.email} />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary="Registered"
                                secondary={DateTime.fromISO(profile.registered_at).toLocaleString(
                                    DateTime.DATETIME_FULL
                                )}
                            />
                        </ListItem>
                    </List>
                </>
            )}
        </MobilePaper>
    );
};

export default Profile;
