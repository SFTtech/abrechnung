import {TextField} from "@mui/material";
import {styled} from "@mui/styles";

export const DisabledTextField = styled(TextField)(({theme}) => ({
    "& .Mui-disabled": {
        color: "rgba(0, 0, 0, 0.87);",
        WebkitTextFillColor: "rgba(0, 0, 0, 0.87);",
    }
}))