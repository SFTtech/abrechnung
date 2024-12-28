import { ListItemLink } from "@/components/style/ListItemLink";
import { useAppDispatch, useAppSelector } from "@/store";
import { getAccountLink } from "@/utils";
import { Group } from "@abrechnung/api";
import { accountEditStarted, copyAccount, selectAccountIdToAccountMap, useIsGroupWritable } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { ContentCopy, Delete, Edit } from "@mui/icons-material";
import { Chip, IconButton, ListItem, ListItemSecondaryAction, ListItemText, Typography } from "@mui/material";
import { DateTime } from "luxon";
import React from "react";
import { useNavigate } from "react-router";

interface Props {
    group: Group;
    account: Account;
    setAccountToDelete: (account: Account) => void;
}

export const ClearingAccountListItem: React.FC<Props> = ({ group, account, setAccountToDelete }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isGroupWritable = useIsGroupWritable(group.id);
    const accounts = useAppSelector((state) => selectAccountIdToAccountMap(state, group.id));

    if (account.type !== "clearing") {
        return null;
    }

    const participatorNames = Object.keys(account.clearing_shares).map((accountId) => accounts[Number(accountId)].name);

    const edit = () => {
        if (!account.is_wip) {
            dispatch(accountEditStarted({ groupId: group.id, accountId: account.id }));
        }
        navigate(getAccountLink(group.id, account.type, account.id));
    };

    const copy = () => {
        dispatch(copyAccount({ groupId: group.id, accountId: account.id }));
    };

    return (
        <ListItem sx={{ padding: 0 }} key={account.id}>
            <ListItemLink sx={{ paddingRight: 17 }} to={getAccountLink(group.id, account.type, account.id)}>
                <ListItemText
                    primaryTypographyProps={{ component: "div" }}
                    secondaryTypographyProps={{ component: "div" }}
                    primary={
                        <>
                            {account.is_wip && (
                                <Chip color="info" variant="outlined" label="WIP" size="small" sx={{ mr: 1 }} />
                            )}
                            <Typography variant="body1" component="span">
                                {account.name}
                            </Typography>
                        </>
                    }
                    secondary={
                        <>
                            <Typography variant="body2" component="span" sx={{ color: "text.primary" }}>
                                {participatorNames.join(", ")}
                            </Typography>
                            <br />
                            {account.date_info &&
                                DateTime.fromISO(account.date_info).toLocaleString(DateTime.DATE_FULL)}
                            {account.tags.map((t) => (
                                <Chip key={t} sx={{ ml: 1 }} variant="outlined" size="small" color="info" label={t} />
                            ))}
                        </>
                    }
                />
            </ListItemLink>
            {isGroupWritable && (
                <ListItemSecondaryAction>
                    <IconButton color="primary" onClick={edit}>
                        <Edit />
                    </IconButton>
                    <IconButton color="primary" onClick={copy}>
                        <ContentCopy />
                    </IconButton>
                    <IconButton color="error" onClick={() => setAccountToDelete(account)}>
                        <Delete />
                    </IconButton>
                </ListItemSecondaryAction>
            )}
        </ListItem>
    );
};
