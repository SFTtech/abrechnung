import EditAccountModal from "../../components/accounts/EditAccountModal";
import React, { useEffect, useState } from "react";
import { Alert, Divider, Grid, IconButton, Input, InputAdornment, List, ListItem, Tooltip } from "@mui/material";
import { Add, Clear } from "@mui/icons-material";
import { TabPanel } from "@mui/lab";
import PersonalAccountListItem from "./PersonalAccountListItem";
import { DeleteAccountModal } from "./DeleteAccountModal";
import { selectAccountSlice, selectAuthSlice, useAppSelector } from "../../store";
import { selectCurrentUserId, selectCurrentUserPermissions, selectGroupAccountsFiltered } from "@abrechnung/redux";

interface Props {
    groupId: number;
    onOpenCreateModal: () => void;
}

export const TabPersonalAccounts: React.FC<Props> = ({ groupId, onOpenCreateModal }) => {
    const [searchValue, setSearchValue] = useState("");
    const personalAccounts = useAppSelector((state) =>
        selectGroupAccountsFiltered({ state: selectAccountSlice(state), groupId, type: "personal" })
    );

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state, groupId }));
    const currentUserId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));

    const [showEditModal, setShowEditModal] = useState(false);

    const [accountDeleteId, setAccountDeleteId] = useState<number | null>(null);
    const showDeleteModal = accountDeleteId !== null;

    const [accountToEdit, setAccountToEdit] = useState<number | null>(null);
    const onShowEditModal = (accountId: number) => {
        setAccountToEdit(accountId);
        setShowEditModal(true);
    };

    const onCloseEditModal = () => {
        setShowEditModal(false);
    };

    const onShowDeleteModal = (accountId: number) => {
        setAccountDeleteId(accountId);
    };
    const onCloseDeleteModal = () => {
        setAccountDeleteId(null);
    };

    const [filteredPersonalAccounts, setFilteredPersonalAccounts] = useState([]);

    useEffect(() => {
        if (searchValue != null && searchValue !== "") {
            setFilteredPersonalAccounts(
                personalAccounts.filter((t) => {
                    return (
                        t.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchValue.toLowerCase())
                    );
                })
            );
        } else {
            return setFilteredPersonalAccounts(personalAccounts);
        }
    }, [personalAccounts, searchValue, setFilteredPersonalAccounts]);

    return (
        <TabPanel value="personal">
            <List>
                {personalAccounts.length === 0 ? (
                    <Alert severity="info">No Accounts</Alert>
                ) : (
                    <>
                        <ListItem>
                            <Input
                                value={searchValue}
                                onChange={(e) => setSearchValue(e.target.value)}
                                placeholder="Search…"
                                inputProps={{
                                    "aria-label": "search",
                                }}
                                endAdornment={
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="clear search input"
                                            onClick={(e) => setSearchValue("")}
                                            edge="end"
                                        >
                                            <Clear />
                                        </IconButton>
                                    </InputAdornment>
                                }
                            />
                        </ListItem>
                        <Divider />
                        {filteredPersonalAccounts.map((account) => (
                            <PersonalAccountListItem
                                key={account.id}
                                groupId={groupId}
                                accountId={account.id}
                                currentUserId={currentUserId}
                                openAccountEdit={onShowEditModal}
                                setAccountToDelete={onShowDeleteModal}
                            />
                        ))}
                    </>
                )}
            </List>
            {permissions.canWrite && (
                <>
                    <Grid container justifyContent="center">
                        <Tooltip title="Create Personal Account">
                            <IconButton color="primary" onClick={onOpenCreateModal}>
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                    <EditAccountModal
                        show={showEditModal}
                        onClose={onCloseEditModal}
                        accountId={accountToEdit}
                        groupId={groupId}
                    />
                    <DeleteAccountModal
                        groupId={groupId}
                        show={showDeleteModal}
                        onClose={onCloseDeleteModal}
                        accountId={accountDeleteId}
                    />
                </>
            )}
        </TabPanel>
    );
};

export default TabPersonalAccounts;
