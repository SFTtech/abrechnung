import { TextField, Theme } from "@mui/material";
import { styled } from "@mui/styles";

export const DisabledTextField = styled(TextField)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: theme.palette.text.primary,
        WebkitTextFillColor: theme.palette.text.primary,
    },
}));
