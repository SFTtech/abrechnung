import { Alert, Box, Button, Container, CssBaseline, Link, Stack, Typography } from "@mui/material";
import React, { useState } from "react";
import { Link as RouterLink, useParams } from "react-router-dom";
import { z } from "zod";
import { api } from "@/core/api";
import i18n from "@/i18n";
import { Trans, useTranslation } from "react-i18next";
import { useTitle } from "@/core/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

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

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            password: "",
            password2: "",
        },
    });

    const onSubmit = (values: FormSchema) => {
        if (!token) {
            return;
        }

        api.client.auth
            .confirmPasswordRecovery({ requestBody: { new_password: values.password, token } })
            .then(() => {
                setStatus("success");
                setError(null);
                resetForm();
            })
            .catch((err) => {
                setStatus("error");
                setError(err.toString());
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
                        <Trans Key="auth.confirmPasswordRecovery.successfulLinkToLogin">
                            Password recovery successful, please
                            <Link to="/login" component={RouterLink}>
                                login
                            </Link>
                            using your new password.
                        </Trans>
                    </Alert>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <Stack spacing={2}>
                            <FormTextField
                                variant="outlined"
                                margin="normal"
                                fullWidth
                                autoFocus
                                type="password"
                                name="password"
                                label={t("common.password")}
                                control={control}
                            />

                            <FormTextField
                                variant="outlined"
                                margin="normal"
                                fullWidth
                                type="password"
                                name="password2"
                                label={t("common.repeatPassword")}
                                control={control}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                sx={{ margin: "3 0 2 0" }}
                            >
                                {t("common.confirm")}
                            </Button>
                        </Stack>
                    </form>
                )}
            </Box>
        </Container>
    );
};
