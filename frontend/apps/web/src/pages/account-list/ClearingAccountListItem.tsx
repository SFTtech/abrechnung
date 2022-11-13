import React from "react";
import { ListItem, IconButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { ListItemLink } from "../../components/style/ListItemLink";
import { Edit, ContentCopy, Delete } from "@mui/icons-material";
import { selectAccountById, selectCurrentUserPermissions } from "@abrechnung/redux";
import { useAppSelector, selectAccountSlice } from "../../store";

interface Props {
    groupId: number;
    accountId: number;
    openClearingAccountEdit: (accountId: number) => void;
    copyClearingAccount: (accountId: number) => void;
    setAccountToDelete: (accountID: number) => void;
}

export const ClearingAccountListItem: React.FC<Props> = ({
    groupId,
    accountId,
    openClearingAccountEdit,
    copyClearingAccount,
    setAccountToDelete,
}) => {
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={`/groups/${groupId}/accounts/${account.id}`}>
                <ListItemText primary={account.name} secondary={account.description} />
            </ListItemLink>
            {permissions.canWrite && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={() => openClearingAccountEdit(account.id)}>
                        <Edit />
                    </IconButton>
                    <IconButton color="primary" onClick={() => copyClearingAccount(account.id)}>
                        <ContentCopy />
                    </IconButton>
                    <IconButton color="error" onClick={() => setAccountToDelete(account.id)}>
                        <Delete />
                    </IconButton>
                </ListItemSecondaryAction>
            )}
        </ListItem>
    );
};

export default ClearingAccountListItem;
