import React from "react";
import { CircularProgress, Grid } from "@mui/material";

export default function Loading() {
    return (
        <Grid container justify="center">
            <CircularProgress />
        </Grid>
    )
}