import { TextField } from "@mui/material";
import { withStyles } from "@mui/styles";

const DisabledTextField = withStyles({
  root: {
    "& .MuiInputBase-root.Mui-disabled": {
      color: "rgba(0, 0, 0, 0.87)" // (default alpha is 0.38)
    }
  }
})(TextField);

export default DisabledTextField;