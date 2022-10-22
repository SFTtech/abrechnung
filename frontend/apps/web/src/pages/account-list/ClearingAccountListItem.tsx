import React from "react";
import { Account, GroupMember } from "@abrechnung/types";
import { ListItem, IconButton, ListItemSecondaryAction, ListItemText } from "@mui/material";
import { ListItemLink } from "../../components/style/ListItemLink";
import { Edit, ContentCopy, Delete } from "@mui/icons-material";

interface Props {
    groupID: number;
    account: Account;
    userPermissions: GroupMember;
    openClearingAccountEdit: (account: Account) => void;
    copyClearingAccount: (account: Account) => void;
    setAccountToDelete: (accountID: number) => void;
}

export const ClearingAccountListItem: React.FC<Props> = ({
    groupID,
    account,
    userPermissions,
    openClearingAccountEdit,
    copyClearingAccount,
    setAccountToDelete,
}) => {
    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={`/groups/${groupID}/accounts/${account.id}`}>
                <ListItemText primary={account.name} secondary={account.description} />
            </ListItemLink>
            {userPermissions.canWrite && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={() => openClearingAccountEdit(account)}>
                        <Edit />
                    </IconButton>
                    <IconButton color="primary" onClick={() => copyClearingAccount(account)}>
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
