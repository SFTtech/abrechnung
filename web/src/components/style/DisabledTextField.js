import { withStyles } from "@material-ui/core";
import TextField from "@material-ui/core/TextField";

const DisabledTextField = withStyles({
  root: {
    "& .MuiInputBase-root.Mui-disabled": {
      color: "rgba(0, 0, 0, 0.87)" // (default alpha is 0.38)
    }
  }
})(TextField);

export default DisabledTextField;