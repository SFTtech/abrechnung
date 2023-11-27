import { selectIsAuthenticated } from "@abrechnung/redux";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { Alert, Box, Button, Container, CssBaseline, LinearProgress, TextField, Typography } from "@mui/material";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { z } from "zod";
import { api } from "@/core/api";
import { selectAuthSlice, useAppSelector } from "@/store";

const validationSchema = z.object({
    email: z.string({ required_error: "email is required" }).email("please enter a valid email address"),
});
type FormSchema = z.infer<typeof validationSchema>;

export const RequestPasswordRecovery: React.FC = () => {
    const isLoggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const [status, setStatus] = useState("initial");
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/");
        }
    }, [isLoggedIn, navigate]);

    const handleSubmit = (values: FormSchema, { setSubmitting, resetForm }: FormikHelpers<FormSchema>) => {
        api.client.auth
            .recoverPassword({ requestBody: { email: values.email } })
            .then(() => {
                setStatus("success");
                setError(null);
                setSubmitting(false);
                resetForm();
            })
            .catch((err) => {
                setStatus("error");
                setError(err.toString());
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
                    <Formik
                        validationSchema={toFormikValidationSchema(validationSchema)}
                        initialValues={{ email: "" }}
                        onSubmit={handleSubmit}
                    >
                        {({
                            values,
                            handleChange,
                            handleBlur,
                            handleSubmit,
                            isSubmitting,
                            touched,
                            errors,
                        }: FormikProps<FormSchema>) => (
                            <Form onSubmit={handleSubmit}>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    fullWidth
                                    autoFocus
                                    type="text"
                                    label="E-Mail"
                                    name="email"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.email}
                                    error={touched.email && !!errors.email}
                                    helperText={touched.email && errors.email}
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
