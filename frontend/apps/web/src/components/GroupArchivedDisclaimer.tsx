import { Group } from "@abrechnung/api";
import { Alert } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";

export type GroupArchivedDisclaimerProps = {
    group: Group;
};

export const GroupArchivedDisclaimer: React.FC<GroupArchivedDisclaimerProps> = ({ group }) => {
    const { t } = useTranslation();

    if (!group.archived) {
        return null;
    }

    return <Alert severity="warning">{t("groups.archivedDisclaimer")}</Alert>;
};
