import React, { useEffect, useState } from "react";
import { useHistory } from "react-router-dom";
import { Form, Formik } from "formik";
import { isAuthenticated } from "../../recoil/auth";
import { useRecoilValue } from "recoil";
import { requestPasswordRecovery } from "../../api";
import { Button, Container, CssBaseline, LinearProgress, TextField, Typography } from "@mui/material";
import { Alert } from "@mui/lab";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    submit: {
        margin: theme.spacing(3, 0, 2)
    },
    alert: {
        marginTop: theme.spacing(4)
    }
}));

export default function RequestPasswordRecovery() {
    const isLoggedIn = useRecoilValue(isAuthenticated);
    const [status, setStatus] = useState("initial");
    const [error, setError] = useState(null);
    const history = useHistory();
    const classes = useStyles();

    useEffect(() => {
        if (isLoggedIn) {
            history.push("/");
        }
    }, [isLoggedIn, history]);

    const handleSubmit = (values, { setSubmitting }) => {
        requestPasswordRecovery(values)
            .then(res => {
                setStatus("success");
                setError(null);
                setSubmitting(false);
            })
            .catch(err => {
                setStatus("error");
                setError(err);
                setSubmitting(false);
            });
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    Recover Password
                </Typography>
                <Typography component="p" variant="body1">
                    Please enter your email. A recovery link will be sent shortly after.
                </Typography>
                {error && (
                    <Alert className={classes.alert} severity="error">{error}</Alert>
                )}
                {status === "success" ? (
                    <Alert className={classes.alert} severity="success">A recovery link has been sent to you via
                        email.</Alert>
                ) : (
                    <Formik initialValues={{ email: "" }} onSubmit={handleSubmit}>
                        {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                            <Form onSubmit={handleSubmit}>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    fullWidth
                                    autoFocus
                                    type="text"
                                    label="E-Mail"
                                    name="email"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.email}
                                />
                                {isSubmitting && <LinearProgress />}
                                <Button
                                    type="submit"
                                    fullWidth
                                    variant="contained"
                                    color="primary"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit}
                                    className={classes.submit}
                                >
                                    Confirm
                                </Button>
                            </Form>
                        )}
                    </Formik>
                )}
            </div>
        </Container>
    );
}
