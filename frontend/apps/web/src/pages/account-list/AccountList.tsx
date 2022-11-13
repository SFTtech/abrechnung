import React, { useState } from "react";
import { Badge, BadgeProps, Box, SpeedDial, SpeedDialAction, SpeedDialIcon, styled, Tab, Theme } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { ClearingAccountIcon, PersonalAccountIcon } from "../../components/style/AbrechnungIcons";
import { useTitle } from "../../core/utils";
import { TabContext, TabList } from "@mui/lab";
import TabClearingAccounts from "./TabClearingAccounts";
import TabPersonalAccounts from "./TabPersonalAccounts";
import { selectAccountSlice, useAppSelector } from "../../store";
import { selectAccountsFilteredCount, selectCurrentUserPermissions } from "@abrechnung/redux";
import { CreateClearingAccountModal } from "../../components/accounts/CreateClearingAccountModal";
import { CreateAccountModal } from "../../components/accounts/CreateAccountModal";
import { Account } from "@abrechnung/types";

const TextBadge = styled(Badge)<BadgeProps>(({ theme }: { theme: Theme }) => ({
    "& .MuiBadge-badge": {
        right: -12,
        border: `2px solid ${theme.palette.background.paper}`,
        padding: "0 4px",
        marginRight: "5px",
    },
})) as typeof Badge;

interface Props {
    groupId: number;
}

export const AccountList: React.FC<Props> = ({ groupId }) => {
    const [speedDialOpen, setSpeedDialOpen] = useState(false);
    const toggleSpeedDial = () => setSpeedDialOpen((currValue) => !currValue);

    const [activeTab, setActiveTab] = useState("personal");

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const numPersonalAccounts = useAppSelector((state) =>
        selectAccountsFilteredCount({ state: selectAccountSlice(state), groupId, type: "personal" })
    );
    const numClearingAccounts = useAppSelector((state) =>
        selectAccountsFilteredCount({ state: selectAccountSlice(state), groupId, type: "clearing" })
    );

    const [showCreatePersonalModal, setShowCreatePersonalModal] = useState(false);
    const openCreatePersonalModal = () => setShowCreatePersonalModal(true);
    const onCloseCreatePersonalModal = (evt, reason) => {
        if (reason !== "backdropClick") {
            setShowCreatePersonalModal(false);
        }
    };

    const [clearingAccountToCopy, setClearingAccountToCopy] = useState<Account | null>(null);
    const [showCreateClearingModal, setShowCreateClearingModal] = useState(false);
    const openCreateClearingModal = () => setShowCreateClearingModal(true);
    const onCloseCreateClearingModal = (evt, reason) => {
        if (reason !== "backdropClick") {
            setShowCreateClearingModal(false);
            setClearingAccountToCopy(null);
        }
    };
    const onCopyClearingAccount = (account: Account) => {
        setClearingAccountToCopy(account);
        openCreateClearingModal();
    };

    // TODO: FIXME
    //useTitle(`${group.name} - Accounts`);

    // TODO: make the speed dial work again with proper modals, though deprecated anyway when we implement proper editing

    return (
        <>
            <MobilePaper>
                <TabContext value={activeTab}>
                    <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
                        <TabList onChange={(e, newValue) => setActiveTab(newValue)} centered>
                            <Tab
                                value="personal"
                                label={
                                    <TextBadge badgeContent={numPersonalAccounts} color="primary">
                                        <span>Personal Accounts</span>
                                    </TextBadge>
                                }
                            />
                            <Tab
                                label={
                                    <TextBadge badgeContent={numClearingAccounts} color="primary">
                                        <span>Clearing Accounts</span>
                                    </TextBadge>
                                }
                                value="clearing"
                            />
                        </TabList>
                    </Box>
                    <TabPersonalAccounts groupId={groupId} onOpenCreateModal={openCreatePersonalModal} />
                    <TabClearingAccounts
                        groupId={groupId}
                        onCopyClearingAccount={onCopyClearingAccount}
                        onOpenCreateModal={openCreateClearingModal}
                    />
                </TabContext>
            </MobilePaper>
            {permissions.canWrite && (
                <>
                    <CreateClearingAccountModal
                        show={showCreateClearingModal}
                        onClose={onCloseCreateClearingModal}
                        initialValues={clearingAccountToCopy}
                        groupId={groupId}
                    />
                    <CreateAccountModal
                        show={showCreatePersonalModal}
                        onClose={onCloseCreatePersonalModal}
                        groupId={groupId}
                    />
                    <SpeedDial
                        ariaLabel="Create Account"
                        sx={{ position: "fixed", bottom: 20, right: 20 }}
                        icon={<SpeedDialIcon />}
                        // onClose={() => setSpeedDialOpen(false)}
                        // onOpen={() => setSpeedDialOpen(true)}
                        onClick={toggleSpeedDial}
                        open={speedDialOpen}
                    >
                        <SpeedDialAction
                            icon={<PersonalAccountIcon />}
                            tooltipTitle="Personal"
                            tooltipOpen
                            onClick={openCreatePersonalModal}
                        />
                        <SpeedDialAction
                            icon={<ClearingAccountIcon />}
                            tooltipTitle="Clearing"
                            tooltipOpen
                            onClick={openCreateClearingModal}
                        />
                    </SpeedDial>
                </>
            )}
        </>
    );
};

export default AccountList;
