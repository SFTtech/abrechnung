import React, { useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Form, Formik, FormikHelpers } from "formik";
import { api } from "@/core/api";
import { toast } from "react-toastify";
import { useQuery, useTitle } from "@/core/utils";
import {
    Avatar,
    Box,
    Button,
    Container,
    CssBaseline,
    Grid,
    LinearProgress,
    Link,
    TextField,
    Typography,
} from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { z } from "zod";
import { useAppDispatch, useAppSelector, selectAuthSlice } from "@/store";
import { selectIsAuthenticated, login } from "@abrechnung/redux";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { useTranslation } from "react-i18next";

const validationSchema = z.object({
    username: z.string({ required_error: "username is required" }),
    password: z.string({ required_error: "password is required" }),
});

type FormValues = z.infer<typeof validationSchema>;

export const Login: React.FC = () => {
    const { t } = useTranslation();
    const isLoggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const dispatch = useAppDispatch();
    const query = useQuery();
    const navigate = useNavigate();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle(t("auth.login.tabTitle"));

    useEffect(() => {
        if (isLoggedIn) {
            if (query.get("next") !== null && query.get("next") !== undefined) {
                navigate(query.get("next"));
            } else {
                navigate("/");
            }
        }
    }, [isLoggedIn, navigate, query]);

    const handleSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        const sessionName = navigator.appVersion + " " + navigator.userAgent + " " + navigator.appName;
        dispatch(login({ username: values.username, password: values.password, sessionName, api }))
            .unwrap()
            .then((res) => {
                toast.success(t("auth.login.loginSuccess"));
                setSubmitting(false);
            })
            .catch((err) => {
                toast.error(err.message);
                setSubmitting(false);
            });
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline />
            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                <Avatar sx={{ margin: 1, backgroundColor: "primary.main" }}>
                    <LockOutlined />
                </Avatar>
                <Typography component="h1" variant="h5">
                    {t("auth.login.header")}
                </Typography>
                <Formik
                    initialValues={{ password: "", username: "" }}
                    onSubmit={handleSubmit}
                    validationSchema={toFormikValidationSchema(validationSchema)}
                >
                    {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                        <Form onSubmit={handleSubmit}>
                            <input type="hidden" name="remember" value="true" />
                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                type="text"
                                label={t("common.username")}
                                name="username"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.username}
                            />

                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                type="password"
                                name="password"
                                label={t("common.password")}
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.password}
                            />

                            {isSubmitting && <LinearProgress />}
                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={isSubmitting}
                                sx={{ mt: 1 }}
                            >
                                {t("auth.login.confirmButton")}
                            </Button>
                            <Grid container={true} sx={{ justifyContent: "flex-end" }}>
                                <Grid item>
                                    <Link to={`/register${queryArgsForward}`} component={RouterLink} variant="body2">
                                        {t("auth.login.noAccountRegister")}
                                    </Link>
                                </Grid>
                            </Grid>
                            <Grid container={true} sx={{ justifyContent: "flex-end" }}>
                                <Grid item>
                                    <Link to="/recover-password" component={RouterLink} variant="body2">
                                        {t("auth.login.forgotPassword")}
                                    </Link>
                                </Grid>
                            </Grid>
                        </Form>
                    )}
                </Formik>
            </Box>
        </Container>
    );
};
