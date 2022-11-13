import React, { useEffect, useState } from "react";
import EditClearingAccountModal from "../../components/accounts/EditClearingAccountModal";
import { Alert, Divider, Grid, IconButton, Input, InputAdornment, List, ListItem, Tooltip } from "@mui/material";
import { Add, Clear } from "@mui/icons-material";
import { TabPanel } from "@mui/lab";
import ClearingAccountListItem from "./ClearingAccountListItem";
import { selectAccountSlice, useAppSelector } from "../../store";
import { selectGroupAccountsFiltered, selectCurrentUserPermissions } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { DeleteAccountModal } from "./DeleteAccountModal";

interface Props {
    groupId: number;
    onCopyClearingAccount: (account: Account) => void;
    onOpenCreateModal: () => void;
}

export const TabClearingAccounts: React.FC<Props> = ({ groupId, onCopyClearingAccount, onOpenCreateModal }) => {
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const clearingAccounts = useAppSelector((state) =>
        selectGroupAccountsFiltered({ state: selectAccountSlice(state), groupId, type: "clearing" })
    );

    const [searchValue, setSearchValue] = useState("");
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

    const onCopyAccount = (accountId: number) => {
        const account = clearingAccounts.find((acc) => acc.id === accountId);
        if (account) {
            onCopyClearingAccount(account);
        }
    };

    const [filteredClearingAccounts, setFilteredClearingAccounts] = useState([]);

    useEffect(() => {
        if (searchValue != null && searchValue !== "") {
            setFilteredClearingAccounts(
                clearingAccounts.filter((t) => {
                    return (
                        t.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                        t.description.toLowerCase().includes(searchValue.toLowerCase())
                    );
                })
            );
        } else {
            return setFilteredClearingAccounts(clearingAccounts);
        }
    }, [clearingAccounts, searchValue, setFilteredClearingAccounts]);

    return (
        <TabPanel value="clearing">
            <List>
                {clearingAccounts.length === 0 ? (
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
                        {filteredClearingAccounts.map((account) => (
                            <ClearingAccountListItem
                                key={account.id}
                                groupId={groupId}
                                accountId={account.id}
                                openClearingAccountEdit={onShowEditModal}
                                copyClearingAccount={onCopyAccount}
                                setAccountToDelete={onShowDeleteModal}
                            />
                        ))}
                    </>
                )}
            </List>
            {permissions.canWrite && (
                <>
                    <Grid container justifyContent="center">
                        <Tooltip title="Create Clearing Account">
                            <IconButton color="primary" onClick={onOpenCreateModal}>
                                <Add />
                            </IconButton>
                        </Tooltip>
                    </Grid>
                    <EditClearingAccountModal
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

export default TabClearingAccounts;
