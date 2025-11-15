import { Checkbox, FormControlLabel, TextField, Theme, Input, InputLabel } from "@mui/material";
import { styled } from "@mui/material/styles";

export const DisabledTextField = styled(TextField)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: `${theme.palette.text.primary} !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    },
})) as typeof TextField;

export const DisabledInput = styled(Input)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: `${theme.palette.text.primary} !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    },
}));

export const DisabledInputLabel = styled(InputLabel)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: `${theme.palette.text.primary} !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    },
}));

export const DisabledFormControlLabel = styled(FormControlLabel)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: `${theme.palette.text.primary} !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    },
})) as typeof FormControlLabel;

export const DisabledCheckbox = styled(Checkbox)(({ theme }: { theme: Theme }) => ({
    "& .Mui-disabled": {
        color: `${theme.palette.text.primary} !important`,
        WebkitTextFillColor: `${theme.palette.text.primary} !important`,
    },
})) as typeof Checkbox;
