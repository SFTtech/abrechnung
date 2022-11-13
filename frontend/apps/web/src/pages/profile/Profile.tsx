import React from "react";
import { Alert, List, ListItem, ListItemText, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import { DateTime } from "luxon";
import { selectProfile } from "@abrechnung/redux";
import { useAppSelector, selectAuthSlice } from "../../store";
import Loading from "../../components/style/Loading";

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
                    {profile.isGuestUser && (
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
                                secondary={DateTime.fromISO(profile.registeredAt).toLocaleString(
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
