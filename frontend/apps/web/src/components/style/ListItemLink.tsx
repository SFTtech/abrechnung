import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { ListItemButton, ListItemButtonProps } from "@mui/material";

type Props = {
    to: string;
    children: React.ReactNode;
    selected?: boolean;
} & ListItemButtonProps;

export const ListItemLink: React.FC<Props> = ({ to, children, selected = false, ...props }) => {
    return (
        <ListItemButton component={RouterLink} selected={selected} to={to} {...props}>
            {children}
        </ListItemButton>
    );
};
