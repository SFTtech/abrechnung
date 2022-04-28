import React, { useEffect } from "react";
import { Link as RouterLink, useHistory } from "react-router-dom";
import { Form, Formik } from "formik";
import { isAuthenticated, userData } from "../../recoil/auth";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { toast } from "react-toastify";
import { fetchProfile, login, removeToken } from "../../api";
import { useQuery, useTitle } from "../../utils";
import {
    Avatar,
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
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: "100%", // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));

export default function Login() {
    const setUserData = useSetRecoilState(userData);
    const isLoggedIn = useRecoilValue(isAuthenticated);
    const query = useQuery();
    const history = useHistory();
    const classes = useStyles();

    const queryArgsForward = query.get("next") != null ? "?next=" + query.get("next") : "";

    useTitle("Abrechnung - Login");

    useEffect(() => {
        if (isLoggedIn) {
            if (query.get("next") !== null && query.get("next") !== undefined) {
                history.push(query.get("next"));
            } else {
                history.push("/");
            }
        }
    }, [isLoggedIn, history, query]);

    const handleSubmit = (values, { setSubmitting }) => {
        login(values)
            .then((res) => {
                toast.success(`Logged in...`);
                setSubmitting(false);
                fetchProfile()
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
            <div className={classes.paper}>
                <Avatar className={classes.avatar}>
                    <LockOutlined />
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>
                <Formik initialValues={{ password: "", username: "" }} onSubmit={handleSubmit}>
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
                                onClick={handleSubmit}
                                className={classes.submit}
                            >
                                Login
                            </Button>
                            <Grid container justify="flex-end">
                                <Grid item>
                                    <Link to={`/register${queryArgsForward}`} component={RouterLink} variant="body2">
                                        No account? register
                                    </Link>
                                </Grid>
                            </Grid>
                            <Grid container justify="flex-end">
                                <Grid item>
                                    <Link to="/recover-password" component={RouterLink} variant="body2">
                                        Forgot your password?
                                    </Link>
                                </Grid>
                            </Grid>
                        </Form>
                    )}
                </Formik>
            </div>
        </Container>
    );
}
