import React from "react";
import { ListItem, ListItemText, Chip, ListItemSecondaryAction, IconButton } from "@mui/material";
import { Edit, Delete } from "@mui/icons-material";
import { ListItemLink } from "../../components/style/ListItemLink";
import { useAppSelector, selectAccountSlice, selectGroupSlice, useAppDispatch } from "../../store";
import {
    selectAccountById,
    selectCurrentUserPermissions,
    selectGroupMemberIdToUsername,
    accountEditStarted,
} from "@abrechnung/redux";
import { useNavigate } from "react-router-dom";

interface Props {
    groupId: number;
    currentUserId: number;
    accountId: number;
    setAccountToDelete: (accountId: number) => void;
}

export const PersonalAccountListItem: React.FC<Props> = ({ groupId, currentUserId, accountId, setAccountToDelete }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const memberIDToUsername = useAppSelector((state) =>
        selectGroupMemberIdToUsername({ state: selectGroupSlice(state), groupId })
    );

    const edit = () => {
        if (!account.isWip) {
            dispatch(accountEditStarted({ groupId, accountId }));
        }
        navigate(`/groups/${groupId}/accounts/${accountId}`);
    };

    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={`/groups/${groupId}/accounts/${account.id}`}>
                <ListItemText
                    primary={
                        <div>
                            {account.isWip && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
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
                    <IconButton color="primary" onClick={edit}>
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
