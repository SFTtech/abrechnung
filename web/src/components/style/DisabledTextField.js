import {TextField} from "@mui/material";
import React from "react";
import {styled} from "@mui/styles";

export const DisabledTextField = styled(TextField)(({theme}) => ({
    "& .Mui-disabled": {
        color: "rgba(0, 0, 0, 0.87);",
        "-webkit-text-fill-color": "rgba(0, 0, 0, 0.87);",
    }
}))