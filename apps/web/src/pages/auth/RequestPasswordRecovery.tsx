import { selectIsAuthenticated } from "@abrechnung/redux";
import { Alert, Box, Button, Container, CssBaseline, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { z } from "zod";
import { api, handleApiError } from "@/core/api";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import { useTitle } from "@/core/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

const validationSchema = z.object({
    email: z.email({ error: (issue) => (issue.input === undefined ? "email is required" : null) }),
});
type FormSchema = z.infer<typeof validationSchema>;

export const RequestPasswordRecovery: React.FC = () => {
    const { t } = useTranslation();
    const isLoggedIn = useAppSelector(selectIsAuthenticated);
    const [status, setStatus] = useState("initial");
    const navigate = useNavigate();

    useTitle(t("auth.recoverPassword.tabTitle"));

    useEffect(() => {
        if (isLoggedIn) {
            navigate("/");
        }
    }, [isLoggedIn, navigate]);

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: { email: "" },
    });

    const onSubmit = (values: FormSchema) => {
        api.client.auth
            .recoverPassword({ requestBody: { email: values.email } })
            .then(() => {
                setStatus("success");
                resetForm();
            })
            .catch((err) => {
                setStatus("error");
                handleApiError(err);
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
                    {t("auth.recoverPassword.header")}
                </Typography>
                <Typography component="p" variant="body1">
                    {t("auth.recoverPassword.body")}
                </Typography>
                {status === "success" ? (
                    <Alert sx={{ mt: 4 }} severity="success">
                        {t("auth.recoverPassword.emailSent")}
                    </Alert>
                ) : (
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <FormTextField
                            variant="outlined"
                            margin="normal"
                            fullWidth
                            autoFocus
                            type="text"
                            label={t("common.email")}
                            name="email"
                            control={control}
                        />
                        <Button type="submit" fullWidth variant="contained" color="primary" sx={{ margin: "3 0 2 0" }}>
                            {t("common.confirm")}
                        </Button>
                    </form>
                )}
            </Box>
        </Container>
    );
};
