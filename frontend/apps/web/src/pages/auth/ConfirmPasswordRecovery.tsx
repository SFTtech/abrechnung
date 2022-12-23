import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { api } from "../../core/api";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import { Alert, Box, Button, Container, CssBaseline, LinearProgress, Link, TextField, Typography } from "@mui/material";
import { z } from "zod";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z
    .object({
        password: z.string({ required_error: "password is required" }),
        password2: z.string({ required_error: "please repeat your desired password" }),
    })
    .refine((data) => data.password === data.password2, {
        message: "passwords don't match",
        path: ["password2"],
    });
type FormSchema = z.infer<typeof validationSchema>;

export const ConfirmPasswordRecovery: React.FC = () => {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const { token } = useParams();

    const handleSubmit = (values: FormSchema, { setSubmitting, resetForm }: FormikHelpers<FormSchema>) => {
        api.confirmPasswordRecovery({ newPassword: values.password, token })
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
        <Container maxWidth="xs">
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
                    Confirm Password Recovery
                </Typography>
                {error && (
                    <Alert sx={{ mt: 4 }} severity="error">
                        {error}
                    </Alert>
                )}
                {status === "success" ? (
                    <Alert sx={{ mt: 4 }} severity="success">
                        Password recovery successful, please{" "}
                        <Link to="/login" component={RouterLink}>
                            login
                        </Link>{" "}
                        using your new password.
                    </Alert>
                ) : (
                    <Formik
                        validationSchema={toFormikValidationSchema(validationSchema)}
                        initialValues={{
                            password: "",
                            password2: "",
                        }}
                        onSubmit={handleSubmit}
                    >
                        {({
                            values,
                            handleChange,
                            handleBlur,
                            isSubmitting,
                            errors,
                            touched,
                        }: FormikProps<FormSchema>) => (
                            <Form>
                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    fullWidth
                                    autoFocus
                                    type="password"
                                    name="password"
                                    label="Password"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.password}
                                    error={touched.password && !!errors.password}
                                    helperText={touched.password && errors.password}
                                />

                                <TextField
                                    variant="outlined"
                                    margin="normal"
                                    fullWidth
                                    type="password"
                                    name="password2"
                                    label="Repeat Password"
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    value={values.password2}
                                    error={touched.password2 && !!errors.password2}
                                    helperText={touched.password2 && errors.password2}
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

export default ConfirmPasswordRecovery;
