import React from "react";
import { Link as RouterLink } from "react-router-dom";
import { ListItemButton } from "@mui/material";

export default function ListItemLink({ to, children, selected = false, ...props }) {
    return (
        <ListItemButton component={RouterLink as any} selected={selected} to={to} {...props}>
            {children}
        </ListItemButton>
    );
}
