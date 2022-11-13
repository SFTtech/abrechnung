import React from "react";
import { ListItem, ListItemText, Chip, ListItemSecondaryAction, IconButton } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { ListItemLink } from "../../components/style/ListItemLink";
import { useAppSelector, selectAccountSlice, selectGroupSlice } from "../../store";
import { selectAccountById, selectCurrentUserPermissions, selectGroupMemberIdToUsername } from "@abrechnung/redux";

interface Props {
    groupId: number;
    currentUserId: number;
    accountId: number;
    openAccountEdit: (accountId: number) => void;
    setAccountToDelete: (accountId: number) => void;
}

const PersonalAccountListItem: React.FC<Props> = ({
    groupId,
    currentUserId,
    accountId,
    openAccountEdit,
    setAccountToDelete,
}) => {
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const memberIDToUsername = useAppSelector((state) =>
        selectGroupMemberIdToUsername({ state: selectGroupSlice(state), groupId })
    );

    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={`/groups/${groupId}/accounts/${account.id}`}>
                <ListItemText
                    primary={
                        <div>
                            <span>{account.name}</span>
                            {account.owningUserID === currentUserId ? (
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
            {permissions.canWrite && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={() => openAccountEdit(account.id)}>
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
