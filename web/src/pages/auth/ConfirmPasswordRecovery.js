import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { confirmPasswordRecovery } from "../../api";
import { Form, Formik } from "formik";
import { Button, Container, CssBaseline, LinearProgress, Link, TextField, Typography } from "@mui/material";
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

export default function ConfirmPasswordRecovery() {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const { token } = useParams();
    const classes = useStyles();

    const handleSubmit = (values, { setSubmitting }) => {
        confirmPasswordRecovery({ newPassword: values.password, token: token })
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

    const validate = (values) => {
        let errors = {};
        if (values.password !== values.password2) {
            errors.password2 = "Passwords do not match";
        }
        return errors;
    };

    return (
        <Container maxWidth="xs">
            <CssBaseline />
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    Confirm Password Recovery
                </Typography>
                {error && (
                    <Alert className={classes.alert} severity="error">{error}</Alert>
                )}
                {status === "success" ? (
                    <Alert className={classes.alert} severity="success">Password recovery successful, please <Link
                        to="/login"
                        component={RouterLink}>login</Link> using
                        your new password.</Alert>
                ) : (
                    <Formik
                        validate={validate}
                        initialValues={{
                            password: "",
                            password2: ""
                        }}
                        onSubmit={handleSubmit}
                    >
                        {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                            <Form>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    fullWidth
                                    type="password"
                                    name="password"
                                    label="Password"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.password}
                                />

                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    required
                                    fullWidth
                                    type="password"
                                    name="password2"
                                    label="Repeat Password"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.password2}
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
