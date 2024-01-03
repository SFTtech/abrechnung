import { toFormikValidationSchema } from "@abrechnung/utils";
import { Alert, Box, Button, Container, CssBaseline, LinearProgress, Link, TextField, Typography } from "@mui/material";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { z } from "zod";
import { api } from "@/core/api";
import i18n from "@/i18n";
import { Trans, useTranslation } from "react-i18next";
import { useTitle } from "@/core/utils";

const validationSchema = z
    .object({
        password: z.string({ required_error: "password is required" }),
        password2: z.string({ required_error: "please repeat your desired password" }),
    })
    .refine((data) => data.password === data.password2, {
        message: i18n.t("common.passwordsDoNotMatch"),
        path: ["password2"],
    });
type FormSchema = z.infer<typeof validationSchema>;

export const ConfirmPasswordRecovery: React.FC = () => {
    const { t } = useTranslation();
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const { token } = useParams();

    useTitle(t("auth.confirmPasswordRecovery.tabTitle"));

    const handleSubmit = (values: FormSchema, { setSubmitting, resetForm }: FormikHelpers<FormSchema>) => {
        api.client.auth
            .confirmPasswordRecovery({ requestBody: { new_password: values.password, token } })
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
                    {t("auth.confirmPasswordRecovery.header")}
                </Typography>
                {error && (
                    <Alert sx={{ mt: 4 }} severity="error">
                        {error}
                    </Alert>
                )}
                {status === "success" ? (
                    <Alert sx={{ mt: 4 }} severity="success">
                        <Trans i18nKey="auth.confirmPasswordRecovery.successfulLinkToLogin">
                            Password recovery successful, please
                            <Link to="/login" component={RouterLink}>
                                login
                            </Link>
                            using your new password.
                        </Trans>
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
                                    label={t("common.password")}
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
                                    label={t("common.repeatPassword")}
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
                                    {t("common.confirm")}
                                </Button>
                            </Form>
                        )}
                    </Formik>
                )}
            </Box>
        </Container>
    );
};
