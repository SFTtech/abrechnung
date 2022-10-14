import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Form, Formik } from "formik";
import { isAuthenticated } from "../../state/auth";
import { useRecoilValue } from "recoil";
import { requestPasswordRecovery } from "../../core/api";
import { Alert, Box, Button, Container, CssBaseline, LinearProgress, TextField, Typography } from "@mui/material";

export const RequestPasswordRecovery: React.FC = () => {
    const isLoggedIn = useRecoilValue(isAuthenticated);
    const [status, setStatus] = useState("initial");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/");
        }
    }, [isLoggedIn, navigate]);

    const handleSubmit = (values, { setSubmitting }) => {
        requestPasswordRecovery(values)
            .then((res) => {
                setStatus("success");
                setError(null);
                setSubmitting(false);
            })
            .catch((err) => {
                setStatus("error");
                setError(err);
                setSubmitting(false);
            });
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box
                sx={{
                    mt: 8,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Typography component="h1" variant="h5">
                    Recover Password
                </Typography>
                <Typography component="p" variant="body1">
                    Please enter your email. A recovery link will be sent shortly after.
                </Typography>
                {error && (
                    <Alert sx={{ mt: 4 }} severity="error">
                        {error}
                    </Alert>
                )}
                {status === "success" ? (
                    <Alert sx={{ mt: 4 }} severity="success">
                        A recovery link has been sent to you via email.
                    </Alert>
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
                                    sx={{ margin: "3 0 2 0" }}
                                >
                                    Confirm
                                </Button>
                            </Form>
                        )}
                    </Formik>
                )}
            </Box>
        </Container>
    );
};

export default RequestPasswordRecovery;
