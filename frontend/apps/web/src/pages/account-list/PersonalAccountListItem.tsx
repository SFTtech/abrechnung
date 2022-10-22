import { Account, GroupMember } from "@abrechnung/types";
import React from "react";
import { ListItem, ListItemText, Chip, ListItemSecondaryAction, IconButton } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { ListItemLink } from "../../components/style/ListItemLink";

interface Props {
    groupID: number;
    currentUserID: number;
    account: Account;
    memberIDToUsername: { [k: number]: string };
    userPermissions: GroupMember;
    openAccountEdit: (account: Account) => void;
    setAccountToDelete: (accountID: number) => void;
}

const PersonalAccountListItem: React.FC<Props> = ({
    groupID,
    currentUserID,
    account,
    memberIDToUsername,
    userPermissions,
    openAccountEdit,
    setAccountToDelete,
}) => {
    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={`/groups/${groupID}/accounts/${account.id}`}>
                <ListItemText
                    primary={
                        <div>
                            <span>{account.name}</span>
                            {account.owningUserID === currentUserID ? (
                                <span>
                                    , owned by <Chip size="small" component="span" color="primary" label="you" />
                                </span>
                            ) : (
                                account.owningUserID !== null && (
                                    <span>
                                        , owned by{" "}
                                        <Chip
                                            size="small"
                                            component="span"
                                            color="secondary"
                                            label={memberIDToUsername[account.owningUserID]}
                                        />
                                    </span>
                                )
                            )}
                        </div>
                    }
                    secondary={account.description}
                />
            </ListItemLink>
            {userPermissions.canWrite && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={() => openAccountEdit(account)}>
                        <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => setAccountToDelete(account.id)}>
                        <Delete />
                    </IconButton>
                </ListItemSecondaryAction>
            )}
        </ListItem>
    );
};

export default PersonalAccountListItem;
