import { selectIsAuthenticated } from "@abrechnung/redux";
import { LockOutlined } from "@mui/icons-material";
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
import { Form, Formik } from "formik";
import React, { useEffect, useState } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { Loading } from "@/components/style/Loading";
import { api } from "@/core/api";
import { useQuery, useTitle } from "@/core/utils";
import { selectAuthSlice, useAppSelector } from "@/store";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z
    .object({
        username: z.string({ required_error: "username is required" }),
        email: z.string({ required_error: "email is required" }),
        password: z.string({ required_error: "password is required" }),
        password2: z.string(),
    })
    .refine((data) => data.password === data.password2, {
        message: "Passwords do not match",
        path: ["password2"],
    });

type FormValues = z.infer<typeof validationSchema>;

export const Register: React.FC = () => {
    const loggedIn = useAppSelector((state) => selectIsAuthenticated({ state: selectAuthSlice(state) }));
    const [loading, setLoading] = useState(true);
    const query = useQuery();
    const navigate = useNavigate();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle("Abrechnung - Register");

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            if (query.get("next") !== null && query.get("next") !== undefined) {
                navigate(query.get("next"));
            } else {
                navigate("/");
            }
        } else {
            setLoading(false);
        }
    }, [loggedIn, navigate, query]);

    const handleSubmit = (values: FormValues, { setSubmitting }) => {
        // extract a potential invite token (which should be a uuid) from the query args
        let inviteToken = undefined;
        console.log(query.get("next"));
        if (query.get("next") !== null && query.get("next") !== undefined) {
            const re = /\/invite\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/;
            const m = query.get("next").match(re);
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
            .then((res) => {
                toast.success(`Registered successfully, please confirm your email before logging in...`, {
                    autoClose: 20000,
                });
                setSubmitting(false);
                navigate(`/login${queryArgsForward}`);
            })
            .catch((err) => {
                toast.error(err);
                setSubmitting(false);
            });
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
                    Register a new account
                </Typography>
                <Formik
                    validationSchema={toFormikValidationSchema(validationSchema)}
                    initialValues={{
                        username: "",
                        email: "",
                        password: "",
                        password2: "",
                    }}
                    onSubmit={handleSubmit}
                >
                    {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                        <Form onSubmit={handleSubmit}>
                            <TextField
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                type="text"
                                label="Username"
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
                                type="email"
                                name="email"
                                label="E-Mail"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.email}
                            />

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
                                sx={{ mt: 1 }}
                            >
                                Register
                            </Button>
                            <Grid container={true} sx={{ justifyContent: "flex-end" }}>
                                <Grid item>
                                    <Link to={`/login${queryArgsForward}`} component={RouterLink} variant="body2">
                                        Already have an account? Sign in
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

export default Register;
