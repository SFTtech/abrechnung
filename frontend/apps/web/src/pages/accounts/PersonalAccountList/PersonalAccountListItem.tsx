import {
    accountEditStarted,
    selectAccountById,
    selectCurrentUserPermissions,
    selectGroupMemberIdToUsername,
} from "@abrechnung/redux";
import { Delete, Edit } from "@mui/icons-material";
import { Chip, IconButton, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import React from "react";
import { useNavigate } from "react-router-dom";
import { ListItemLink } from "@/components/style/ListItemLink";
import { selectAccountSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";

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
        if (!account.is_wip) {
            dispatch(accountEditStarted({ groupId, accountId }));
        }
        navigate(getAccountLink(groupId, account.type, account.id));
    };
    let owningUserInfo = null;
    if (account.type === "personal" && account.owning_user_id !== null) {
        if (account.owning_user_id === currentUserId) {
            owningUserInfo = (
                <span>
                    , owned by <Chip size="small" component="span" color="primary" label="you" />
                </span>
            );
        } else {
            owningUserInfo = (
                <span>
                    , owned by{" "}
                    <Chip
                        size="small"
                        component="span"
                        color="secondary"
                        label={memberIDToUsername[account.owning_user_id]}
                    />
                </span>
            );
        }
    }

    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink to={getAccountLink(groupId, account.type, account.id)}>
                <ListItemText
                    primaryTypographyProps={{ component: "div" }}
                    secondaryTypographyProps={{ component: "div" }}
                    primary={
                        <div>
                            {account.is_wip && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
                            <span>{account.name}</span>
                            {owningUserInfo}
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
