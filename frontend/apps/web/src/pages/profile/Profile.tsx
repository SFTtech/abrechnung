import Loading from "@/components/style/Loading";
import { MobilePaper } from "@/components/style/mobile";
import { useTitle } from "@/core/utils";
import { selectAuthSlice, useAppSelector } from "@/store";
import { selectProfile } from "@abrechnung/redux";
import { Alert, List, ListItem, ListItemText, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { useTranslation } from "react-i18next";

export const Profile: React.FC = () => {
    const { t } = useTranslation();
    const profile = useAppSelector((state) => selectProfile({ state: selectAuthSlice(state) }));
    useTitle(t("profile.index.tabTitle"));

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("profile.index.pageTitle")}
            </Typography>
            {profile === undefined ? (
                <Loading />
            ) : (
                <>
                    {profile.is_guest_user && <Alert severity="info">{t("profile.index.guestUserDisclaimer")}</Alert>}
                    <List>
                        <ListItem>
                            <ListItemText primary={t("common.username")} secondary={profile.username} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary={t("common.email")} secondary={profile.email} />
                        </ListItem>
                        <ListItem>
                            <ListItemText
                                primary={t("profile.index.registered")}
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
