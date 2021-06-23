import React from "react";
import CircularProgress from "@material-ui/core/CircularProgress";
import Grid from "@material-ui/core/Grid";

export default function Loading() {
    return (
        <Grid container justify="center">
            <CircularProgress />
        </Grid>
    )
}