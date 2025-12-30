import { ClearingAccountParticipants } from "@/components/accounts";
import { ListItemLink } from "@/components/style/ListItemLink";
import { useFormatDatetime } from "@/hooks";
import { useAppDispatch } from "@/store";
import { getAccountLink } from "@/utils";
import { Group } from "@abrechnung/api";
import { accountEditStarted, copyAccount, useIsGroupWritable } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { ContentCopy, Delete, Edit } from "@mui/icons-material";
import { Chip, Divider, IconButton, ListItemText, Typography } from "@mui/material";
import * as React from "react";
import { useNavigate } from "react-router";

interface Props {
    group: Group;
    account: Account;
    setAccountToDelete: (account: Account) => void;
}

export const ClearingAccountListItem: React.FC<Props> = ({ group, account, setAccountToDelete }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();
    const formatDatetime = useFormatDatetime();

    const isGroupWritable = useIsGroupWritable(group.id);

    if (account.type !== "clearing") {
        return null;
    }

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
        <>
            <ListItemLink
                sx={{ paddingRight: 17 }}
                to={getAccountLink(group.id, account.type, account.id)}
                secondaryAction={
                    isGroupWritable && (
                        <>
                            <IconButton color="primary" onClick={edit}>
                                <Edit />
                            </IconButton>
                            <IconButton color="primary" onClick={copy}>
                                <ContentCopy />
                            </IconButton>
                            <IconButton color="error" onClick={() => setAccountToDelete(account)}>
                                <Delete />
                            </IconButton>
                        </>
                    )
                }
            >
                <ListItemText
                    slotProps={{ primary: { component: "div" }, secondary: { component: "div" } }}
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
                                <ClearingAccountParticipants groupId={group.id} account={account} />
                            </Typography>
                            <br />
                            {account.date_info && formatDatetime(account.date_info, "date")}
                            {account.tags.map((t) => (
                                <Chip key={t} sx={{ ml: 1 }} variant="outlined" size="small" color="info" label={t} />
                            ))}
                        </>
                    }
                />
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
