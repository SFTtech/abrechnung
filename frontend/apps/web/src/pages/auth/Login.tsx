import React, { useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Form, Formik } from "formik";
import { isAuthenticated, userData } from "../../state/auth";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
import { api, login, removeToken } from "../../core/api";
import { useQuery, useTitle } from "../../core/utils";
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
import * as yup from "yup";

const validationSchema = yup.object({
    username: yup.string().required("username is required"),
    password: yup.string().required("password is required"),
});

export const Login: React.FC = () => {
    const setUserData = useSetRecoilState(userData);
    const isLoggedIn = useRecoilValue(isAuthenticated);
    const query = useQuery();
    const navigate = useNavigate();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle("Abrechnung - Login");

    useEffect(() => {
        if (isLoggedIn) {
            if (query.get("next") !== null && query.get("next") !== undefined) {
                navigate(query.get("next"));
            } else {
                navigate("/");
            }
        }
    }, [isLoggedIn, navigate, query]);

    const handleSubmit = (values: { username: string; password: string }, { setSubmitting }) => {
        login(values.username, values.password)
            .then((res) => {
                toast.success(`Logged in...`);
                setSubmitting(false);
                api.fetchProfile()
                    .then((result) => {
                        setUserData(result);
                    })
                    .catch((err) => {
                        toast.error(err);
                        removeToken();
                        setUserData(null);
                    });
            })
            .catch((err) => {
                toast.error(err);
                setSubmitting(false);
                removeToken();
                setUserData(null);
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
                    Sign in
                </Typography>
                <Formik
                    initialValues={{ password: "", username: "" }}
                    onSubmit={handleSubmit}
                    validationSchema={validationSchema}
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
                                type="password"
                                name="password"
                                label="Password"
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
                                Login
                            </Button>
                            <Grid container={true} sx={{ justifyContent: "flex-end" }}>
                                <Grid item>
                                    <Link to={`/register${queryArgsForward}`} component={RouterLink} variant="body2">
                                        No account? register
                                    </Link>
                                </Grid>
                            </Grid>
                            <Grid container={true} sx={{ justifyContent: "flex-end" }}>
                                <Grid item>
                                    <Link to="/recover-password" component={RouterLink} variant="body2">
                                        Forgot your password?
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

export default Login;
