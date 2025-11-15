import React from "react";
import { Link as RouterLink } from "react-router";
import { ListItem, ListItemButton, ListItemProps } from "@mui/material";

type Props = {
    to: string;
    children: React.ReactNode;
    selected?: boolean;
} & ListItemProps;

export const ListItemLink: React.FC<Props> = ({ to, children, selected = false, ...props }) => {
    return (
        <ListItem {...props} disablePadding>
            <ListItemButton component={RouterLink} selected={selected} to={to}>
                {children}
            </ListItemButton>
        </ListItem>
    );
};
