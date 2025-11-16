import { MobilePaper } from "@/components/style";
import { Loading } from "@abrechnung/components";
import { useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { selectProfile } from "@abrechnung/redux";
import { Alert, List, ListItem, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { useFormatDatetime } from "@/hooks";

export const Profile: React.FC = () => {
    const { t } = useTranslation();
    const profile = useAppSelector(selectProfile);
    const formatDatetime = useFormatDatetime();
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
                                secondary={formatDatetime(profile.registered_at, "full")}
                            />
                        </ListItem>
                    </List>
                </>
            )}
        </MobilePaper>
    );
};
