import { ListItemLink } from "@/components/style/ListItemLink";
import { useAppDispatch } from "@/store";
import { getAccountLink } from "@/utils";
import { accountEditStarted, useIsGroupWritable } from "@abrechnung/redux";
import { Account } from "@abrechnung/types";
import { Delete, Edit } from "@mui/icons-material";
import { Chip, Divider, IconButton, ListItemText, Stack } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";

interface Props {
    groupId: number;
    currentUserId: number;
    account: Account;
    setAccountToDelete: (account: Account) => void;
}

export const PersonalAccountListItem: React.FC<Props> = ({ groupId, currentUserId, account, setAccountToDelete }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isGroupWritable = useIsGroupWritable(groupId);

    if (!account) {
        return <Navigate to="/404" />;
    }

    const edit = () => {
        if (!account.is_wip) {
            dispatch(accountEditStarted({ groupId, accountId: account.id }));
        }
        navigate(getAccountLink(groupId, account.type, account.id));
    };
    let owningUserInfo = null;
    if (account.type === "personal" && account.owning_user_id === currentUserId) {
        owningUserInfo = <Chip size="small" component="span" color="primary" label={t("groups.memberList.itsYou")} />;
    }

    return (
        <>
            <ListItemLink
                to={getAccountLink(groupId, account.type, account.id)}
                secondaryAction={
                    isGroupWritable && (
                        <>
                            <IconButton color="primary" onClick={edit}>
                                <Edit />
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
                        <Stack spacing={1} direction="row">
                            {account.is_wip && <Chip color="info" variant="outlined" label="WIP" size="small" />}
                            <span>{account.name}</span>
                            {owningUserInfo}
                        </Stack>
                    }
                    secondary={account.description}
                />
            </ListItemLink>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
