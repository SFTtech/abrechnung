import { selectIsAuthenticated } from "@abrechnung/redux";
import { LockOutlined } from "@mui/icons-material";
import { Avatar, Box, Button, Container, CssBaseline, Grid2 as Grid, Link, Typography } from "@mui/material";
import React, { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { z } from "zod";
import { FormTextField, Loading } from "@abrechnung/components";
import { api, handleApiError } from "@/core/api";
import { useQuery, useTitle } from "@/core/utils";
import { useAppSelector } from "@/store";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const validationSchema = z
    .object({
        username: z.string({ required_error: "username is required" }),
        email: z.string({ required_error: "email is required" }),
        password: z.string({ required_error: "password is required" }),
        password2: z.string(),
    })
    .refine((data) => data.password === data.password2, {
        message: i18n.t("common.passwordsDoNotMatch"),
        path: ["password2"],
    });

type FormValues = z.infer<typeof validationSchema>;

export const Register: React.FC = () => {
    const { t } = useTranslation();
    const loggedIn = useAppSelector(selectIsAuthenticated);
    const [loading, setLoading] = useState(true);
    const query = useQuery();
    const navigate = useNavigate();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle(t("auth.register.tabTitle"));

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            const next = query.get("next");
            navigate(next ?? "/");
        } else {
            setLoading(false);
        }
    }, [loggedIn, navigate, query]);

    const { control, handleSubmit } = useForm({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            username: "",
            email: "",
            password: "",
            password2: "",
        },
    });

    const onSubmit = (values: FormValues) => {
        // extract a potential invite token (which should be a uuid) from the query args
        let inviteToken = undefined;
        if (query.get("next") !== null && query.get("next") !== undefined) {
            const re = /\/invite\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
            const m = query.get("next")?.match(re);
            if (m != null) {
                inviteToken = m[1];
            }
        }

        api.client.auth
            .register({
                requestBody: {
                    username: values.username,
                    email: values.email,
                    password: values.password,
                    invite_token: inviteToken,
                },
            })
            .then((resp) => {
                toast.success(t("auth.register.registrationSuccess"), {
                    autoClose: 20000,
                });
                navigate(`/login${queryArgsForward}`);
            })
            .catch(handleApiError);
    };

    if (loading) {
        return <Loading />;
    }

    return (
        <Container maxWidth="xs">
            <CssBaseline />
            <Box
                sx={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                }}
            >
                <Avatar sx={{ margin: 1, backgroundColor: "primary.main" }}>
                    <LockOutlined />
                </Avatar>
                <Typography component="h1" variant="h5">
                    {t("auth.register.header")}
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormTextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                        type="text"
                        label={t("common.username")}
                        name="username"
                        control={control}
                    />
                    <FormTextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        type="email"
                        name="email"
                        label={t("common.email")}
                        control={control}
                    />

                    <FormTextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        type="password"
                        name="password"
                        label={t("common.password")}
                        control={control}
                    />

                    <FormTextField
                        variant="outlined"
                        margin="normal"
                        required
                        fullWidth
                        type="password"
                        name="password2"
                        label={t("common.repeatPassword")}
                        control={control}
                    />

                    <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 1 }}>
                        {t("auth.register.confirmButton")}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid>
                            <Link to={`/login${queryArgsForward}`} component={RouterLink} variant="body2">
                                {t("auth.register.alreadyHasAccount")}
                            </Link>
                        </Grid>
                    </Grid>
                </form>
            </Box>
        </Container>
    );
};
