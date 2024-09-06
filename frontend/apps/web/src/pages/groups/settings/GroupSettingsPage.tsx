import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { useCurrentUserPermissions, useGroup } from "@abrechnung/redux";
import { Alert, Box, Stack, Tab } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { SettingsForm } from "./SettingsForm";
import { GroupMemberList } from "./GroupMemberList";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import { useQueryVar } from "@abrechnung/utils";
import { GroupInvites } from "./GroupInvites";

interface Props {
    groupId: number;
}

export const GroupSettingsPage: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useQueryVar("activeTab", "settings");

    const group = useGroup(groupId);
    const permissions = useCurrentUserPermissions(groupId);

    useTitle(t("groups.settings.tabTitle", "", { groupName: group?.name }));

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

    return (
        <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList onChange={(e, newVal) => setActiveTab(newVal)}>
                    <Tab label={t("groups.settings.header")} value="settings" />
                    <Tab label={t("groups.invites.header")} value="invites" />
                </TabList>
            </Box>
            <TabPanel value="settings">
                <Stack spacing={2}>
                    <MobilePaper>
                        {permissions.is_owner ? (
                            <Alert severity="info">{t("groups.settings.ownerDisclaimer")}</Alert>
                        ) : !permissions.can_write ? (
                            <Alert severity="info">{t("groups.settings.readAccessDisclaimer")}</Alert>
                        ) : null}
                        <SettingsForm group={group} />
                    </MobilePaper>
                    <MobilePaper>
                        <GroupMemberList group={group} />
                    </MobilePaper>
                </Stack>
            </TabPanel>
            <TabPanel value="invites">
                <MobilePaper>
                    <GroupInvites group={group} />
                </MobilePaper>
            </TabPanel>
        </TabContext>
    );
};
