import React from "react";
import {Link as RouterLink} from "react-router-dom";
import { ListItem } from "@mui/material";

export default function ListItemLink(props) {
    const {to, children} = props;

    const renderLink = React.useMemo(
        () => React.forwardRef((itemProps, ref) => <RouterLink to={to} ref={ref} {...itemProps} />),
        [to],
    );

    return (
        <ListItem button component={renderLink}>
            {children}
        </ListItem>
    );
}