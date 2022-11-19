import React from "react";
import { Chip, ListItem, IconButton, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { ListItemLink } from "../../components/style/ListItemLink";
import { Edit, ContentCopy, Delete } from "@mui/icons-material";
import { selectAccountById, selectCurrentUserPermissions, accountEditStarted } from "@abrechnung/redux";
import { useAppSelector, selectAccountSlice, useAppDispatch } from "../../store";
import { useNavigate } from "react-router-dom";

interface Props {
    groupId: number;
    accountId: number;
    setAccountToDelete: (accountID: number) => void;
}

export const ClearingAccountListItem: React.FC<Props> = ({ groupId, accountId, setAccountToDelete }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
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
                        <>
                            {account.isWip && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body1" component="span">
                                {account.name}
                            </Typography>
                        </>
                    }
                    secondary={account.description}
                />
            </ListItemLink>
            {permissions.canWrite && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={edit}>
                        <Edit />
                    </IconButton>
                    <IconButton color="primary">
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
