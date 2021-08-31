import React, {useState} from "react";
import {Link as RouterLink, useParams} from "react-router-dom";
import Loading from "../../components/style/Loading";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import Link from "@material-ui/core/Link";
import {Alert} from "@material-ui/lab";
import {confirmRegistration} from "../../api";
import {Container, makeStyles, Paper} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        paddingTop: theme.spacing(2),
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
}));

export default function ConfirmRegistration() {
    const [error, setError] = useState(null);
    const [status, setStatus] = useState("idle");
    const {token} = useParams();
    const classes = useStyles();

    const confirmEmail = (e) => {
        e.preventDefault();
        setStatus("loading");
        confirmRegistration({token: token})
            .then(value => {
                setError(null);
                setStatus("success");
            })
            .catch(err => {
                setError(err);
                setStatus("failed")
            });
    };

    return (
        <Container maxWidth="xs">
            <Paper elevation={1} className={classes.paper}>
                <Typography component="h1" variant="h5">
                    Confirm Registration
                </Typography>
                {error && <Alert severity="error">{error}</Alert>}
                {status === "success" ? (
                    <>
                        <Alert severity="success">Confirmation successful</Alert>
                        <p>
                            Please <Link to="/login" component={RouterLink}>login</Link> using your credentials.
                        </p>
                    </>
                ) : status === "loading" ? (
                    <Loading/>
                ) : (
                    <p>
                        Click{" "}
                        <Button color="primary" onClick={confirmEmail}>
                            here
                        </Button>{" "}
                        to confirm your registration.
                    </p>
                )}
            </Paper>
        </Container>
    );
}
