import { MobilePaper } from "@/components/style";
import { useTitle } from "@/core/utils";
import { Group } from "@abrechnung/api";
import { archiveGroup, leaveGroup, unarchiveGroup, useCurrentUserPermissions, useGroup } from "@abrechnung/redux";
import { useQueryVar } from "@abrechnung/utils";
import { TabContext, TabList, TabPanel } from "@mui/lab";
import {
    Alert,
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Stack,
    Tab,
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { GroupInvites } from "./GroupInvites";
import { GroupMemberList } from "./GroupMemberList";
import { SettingsForm } from "./SettingsForm";
import { useAppDispatch } from "@/store";
import { api } from "@/core/api";
import { toast } from "react-toastify";
import { Archive as ArchiveIcon, Logout as LogoutIcon } from "@mui/icons-material";
import { GroupArchivedDisclaimer } from "@/components";

interface Props {
    groupId: number;
}

const GroupActions: React.FC<{ group: Group }> = ({ group }) => {
    const { t } = useTranslation();
    const [showLeaveModal, setShowLeaveModal] = React.useState(false);
    const [showArchiveModal, setShowArchiveModal] = React.useState(false);
    const [showUnarchiveModal, setShowUnarchiveModal] = React.useState(false);
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const confirmLeaveGroup = () => {
        dispatch(leaveGroup({ groupId: group.id, api }))
            .unwrap()
            .then(() => {
                navigate("/");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    const confirmArchiveGroup = () => {
        dispatch(archiveGroup({ groupId: group.id, api }))
            .unwrap()
            .then(() => setShowArchiveModal(false))
            .catch((err) => {
                toast.error(err.message);
            });
    };

    const confirmUnarchiveGroup = () => {
        dispatch(unarchiveGroup({ groupId: group.id, api }))
            .unwrap()
            .then(() => setShowUnarchiveModal(false))
            .catch((err) => {
                toast.error(err.message);
            });
    };

    return (
        <>
            <Stack direction={{ xs: "column", md: "row" }} spacing={1}>
                <Button
                    variant="contained"
                    color="error"
                    onClick={() => setShowLeaveModal(true)}
                    startIcon={<LogoutIcon />}
                >
                    {t("groups.settings.leaveGroup")}
                </Button>
                {group.is_owner && !group.archived && (
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => setShowArchiveModal(true)}
                        startIcon={<ArchiveIcon />}
                    >
                        {t("groups.settings.archiveGroup")}
                    </Button>
                )}
                {group.is_owner && group.archived && (
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => setShowUnarchiveModal(true)}
                        startIcon={<ArchiveIcon />}
                    >
                        {t("groups.settings.unarchiveGroup")}
                    </Button>
                )}
            </Stack>
            <Dialog open={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
                <DialogTitle>{t("groups.settings.leaveGroup")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>{t("groups.settings.leaveGroupConfirm", { group })}</span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="error" onClick={confirmLeaveGroup}>
                        {t("common.yes")}
                    </Button>
                    <Button color="primary" onClick={() => setShowLeaveModal(false)}>
                        {t("common.no")}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showArchiveModal} onClose={() => setShowArchiveModal(false)}>
                <DialogTitle>{t("groups.settings.archiveGroup")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>{t("groups.settings.archiveGroupConfirm", { group })}</span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="error" onClick={confirmArchiveGroup}>
                        {t("common.yes")}
                    </Button>
                    <Button color="primary" onClick={() => setShowArchiveModal(false)}>
                        {t("common.no")}
                    </Button>
                </DialogActions>
            </Dialog>
            <Dialog open={showUnarchiveModal} onClose={() => setShowUnarchiveModal(false)}>
                <DialogTitle>{t("groups.settings.unarchiveGroup")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>{t("groups.settings.unarchiveGroupConfirm", { group })}</span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="error" onClick={confirmUnarchiveGroup}>
                        {t("common.yes")}
                    </Button>
                    <Button color="primary" onClick={() => setShowUnarchiveModal(false)}>
                        {t("common.no")}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
};

export const GroupSettingsPage: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useQueryVar("activeTab", "settings");

    const group = useGroup(groupId);
    const permissions = useCurrentUserPermissions(groupId);

    useTitle(t("groups.settings.tabTitle", { groupName: group?.name }));

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

    return (
        <TabContext value={activeTab}>
            <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                <TabList onChange={(e, newVal) => setActiveTab(newVal)}>
                    <Tab label={t("groups.settings.header")} value="settings" />
                    <Tab label={t("groups.memberList.header")} value="members" />
                    <Tab label={t("groups.invites.header")} value="invites" />
                </TabList>
            </Box>
            <TabPanel value="settings" sx={{ padding: 0 }}>
                <Stack spacing={2}>
                    <MobilePaper>
                        <Stack spacing={1}>
                            <GroupArchivedDisclaimer group={group} />
                            {permissions.is_owner ? (
                                <Alert severity="info">{t("groups.settings.ownerDisclaimer")}</Alert>
                            ) : !permissions.can_write ? (
                                <Alert severity="info">{t("groups.settings.readAccessDisclaimer")}</Alert>
                            ) : null}
                        </Stack>
                        <SettingsForm group={group} />
                    </MobilePaper>
                    <MobilePaper>
                        <Stack spacing={1}>
                            <Alert severity="error">{t("groups.settings.dangerZone")}</Alert>
                            <GroupActions group={group} />
                        </Stack>
                    </MobilePaper>
                </Stack>
            </TabPanel>
            <TabPanel value="members" sx={{ padding: 0 }}>
                <MobilePaper>
                    <GroupMemberList group={group} />
                </MobilePaper>
            </TabPanel>
            <TabPanel value="invites" sx={{ padding: 0 }}>
                <MobilePaper>
                    <GroupInvites group={group} />
                </MobilePaper>
            </TabPanel>
        </TabContext>
    );
};
