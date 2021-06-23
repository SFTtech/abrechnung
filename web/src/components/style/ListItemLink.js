import React from "react";
import ListItem from "@material-ui/core/ListItem";
import {Link as RouterLink} from "react-router-dom";

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