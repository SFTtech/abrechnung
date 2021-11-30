import {TextField} from "@mui/material";
import React from "react";


// const useStyles = makeStyles((theme) => ({
//     root: {
//         "-webkit-text-fill-color": "rgba(0, 0, 0, 0.8) !important",
//         color: "rgba(0, 0, 0, 0.8) !important"
//     }
// }));

export function DisabledTextField(props) {
    // const classes = useStyles();
    return (
        <TextField
            // FIXME: this is a bit hacky, but so far could not figure out another way to properly render a normal colored, disabled text field
            style={{"-webkit-text-fill-color": "rgba(0, 0, 0, 0.8)", color: "rgba(0, 0, 0, 0.8)"}}
            // classes={classes.root}
            disabled={true}
            {...props}
        />
    )
}