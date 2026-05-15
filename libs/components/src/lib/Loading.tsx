import React from "react";
import { CircularProgress, Grid } from "@mui/material";

export const Loading: React.FC = () => {
    return (
        <Grid container direction="row" sx={{ justifyContent: "center", alignItems: "center" }}>
            <CircularProgress />
        </Grid>
    );
};
