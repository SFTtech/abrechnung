import React, { useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router";
import { api } from "@/core/api";
import { toast } from "react-toastify";
import { useQuery, useTitle } from "@/core/utils";
import { Avatar, Box, Button, Container, CssBaseline, Grid2 as Grid, Link, Typography } from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { z } from "zod";
import { useAppDispatch, useAppSelector } from "@/store";
import { selectIsAuthenticated, login } from "@abrechnung/redux";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

const validationSchema = z.object({
    username: z.string({ required_error: "username is required" }),
    password: z.string({ required_error: "password is required" }),
});

type FormValues = z.infer<typeof validationSchema>;

export const Login: React.FC = () => {
    const { t } = useTranslation();
    const isLoggedIn = useAppSelector(selectIsAuthenticated);
    const dispatch = useAppDispatch();
    const query = useQuery();
    const navigate = useNavigate();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle(t("auth.login.tabTitle"));

    useEffect(() => {
        if (isLoggedIn) {
            const next = query.get("next");
            navigate(next ?? "/");
        }
    }, [isLoggedIn, navigate, query]);

    const { control, handleSubmit } = useForm<FormValues>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            password: "",
            username: "",
        },
    });

    const onSubmit = (values: FormValues) => {
        const sessionName = navigator.userAgent;
        dispatch(login({ username: values.username, password: values.password, sessionName, api }))
            .unwrap()
            .then((res) => {
                toast.success(t("auth.login.loginSuccess"));
            })
            .catch((err) => {
                toast.error(err.message);
            });
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box display="flex" flexDirection="column" alignItems="center">
                <Avatar sx={{ margin: 1, backgroundColor: "primary.main" }}>
                    <LockOutlined />
                </Avatar>
                <Typography component="h1" variant="h5">
                    {t("auth.login.header")}
                </Typography>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <input type="hidden" name="remember" value="true" />
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
                        type="password"
                        name="password"
                        label={t("common.password")}
                        control={control}
                    />

                    <Button type="submit" fullWidth variant="contained" color="primary" sx={{ mt: 1 }}>
                        {t("auth.login.confirmButton")}
                    </Button>
                    <Grid container justifyContent="flex-end">
                        <Grid>
                            <Link to={`/register${queryArgsForward}`} component={RouterLink} variant="body2">
                                {t("auth.login.noAccountRegister")}
                            </Link>
                        </Grid>
                    </Grid>
                    <Grid container justifyContent="flex-end">
                        <Grid>
                            <Link to="/recover-password" component={RouterLink} variant="body2">
                                {t("auth.login.forgotPassword")}
                            </Link>
                        </Grid>
                    </Grid>
                </form>
            </Box>
        </Container>
    );
};
