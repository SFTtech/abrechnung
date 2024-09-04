import { accountEditStarted, selectGroupMemberIdToUsername, useCurrentUserPermissions } from "@abrechnung/redux";
import { Delete, Edit } from "@mui/icons-material";
import { Chip, IconButton, ListItem, ListItemSecondaryAction, ListItemText } from "@mui/material";
import React from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ListItemLink } from "@/components/style/ListItemLink";
import { useAppDispatch, useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";
import { Account } from "@abrechnung/types";

interface Props {
    groupId: number;
    currentUserId: number;
    account: Account;
    setAccountToDelete: (account: Account) => void;
}

export const PersonalAccountListItem: React.FC<Props> = ({ groupId, currentUserId, account, setAccountToDelete }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const permissions = useCurrentUserPermissions(groupId);
    const memberIDToUsername = useAppSelector((state) => selectGroupMemberIdToUsername(state, groupId));

    if (!permissions || !account) {
        return <Navigate to="/404" />;
    }

    const edit = () => {
        if (!account.is_wip) {
            dispatch(accountEditStarted({ groupId, accountId: account.id }));
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
            {permissions.can_write && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={edit}>
                        <Edit />
                    </IconButton>
                    <IconButton color="error" onClick={() => setAccountToDelete(account)}>
                        <Delete />
                    </IconButton>
                </ListItemSecondaryAction>
            )}
        </ListItem>
    );
};
