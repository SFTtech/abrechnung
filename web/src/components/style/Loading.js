import React from "react";
import { CircularProgress, Grid } from "@mui/material";

export default function Loading() {
    return (
        <Grid container direction="row" justifyContent="center" alignItems="center">
            <CircularProgress />
        </Grid>
    );
}
