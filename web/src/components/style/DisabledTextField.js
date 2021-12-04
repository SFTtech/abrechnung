import {TextField} from "@mui/material";
import React from "react";


export function DisabledTextField(props) {
    return (
        <TextField
            // FIXME: this is a bit hacky, but so far could not figure out another way to properly render a normal colored, disabled text field
            style={{"-webkit-text-fill-color": "rgba(0, 0, 0, 0.8)", color: "rgba(0, 0, 0, 0.8)"}}
            disabled={true}
            {...props}
        />
    )
}