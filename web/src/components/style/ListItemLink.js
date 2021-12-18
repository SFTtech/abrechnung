import React from "react";
import {Link as RouterLink} from "react-router-dom";
import {ListItemButton, ListItemText} from "@mui/material";

export default function ListItemLink({to, children, selected = false, ...props}) {
    const renderLink = React.useMemo(
        () =>
            React.forwardRef(function Link(itemProps, ref) {
                return <RouterLink to={to} ref={ref} {...itemProps} role={undefined}/>;
            }),
        [to],
    );
    return (
        <ListItemButton component={renderLink} selected={selected} props={props}>
            {children}
        </ListItemButton>
    );
}