import React, {useEffect} from "react";
import {Link as RouterLink, useHistory} from "react-router-dom";
import {Field, Form, Formik} from "formik";
import {isAuthenticated, userData} from "../../recoil/auth";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {toast} from "react-toastify";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import {TextField} from "formik-material-ui";
import {Container, CssBaseline, makeStyles} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import Avatar from "@material-ui/core/Avatar";
import LockOutlinedIcon from "@material-ui/icons/LockOutlined";
import {fetchProfile, login, removeToken} from "../../api";
import Grid from "@material-ui/core/Grid";
import Link from "@material-ui/core/Link";
import {useQuery} from "../../utils";

const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: "flex",
        flexDirection: "column",
        alignItems: "center"
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main
    },
    form: {
        width: "100%", // Fix IE 11 issue.
        marginTop: theme.spacing(1)
    },
    submit: {
        margin: theme.spacing(3, 0, 2)
    }
}));

export default function Login() {
    const setUserData = useSetRecoilState(userData);
    const isLoggedIn = useRecoilValue(isAuthenticated);
    const query = useQuery();
    const history = useHistory();
    const classes = useStyles();

    useEffect(() => {
        if (isLoggedIn) {
            if (query.get("next") !== null && query.get("next") !== undefined) {
                history.push(query.get("next"));
            } else {
                history.push("/");
            }
        }
    }, [isLoggedIn, history, query]);

    const handleSubmit = (values, {setSubmitting}) => {
        login(values).then(res => {
            toast.success(`Logged in...`);
            setSubmitting(false);
            fetchProfile()
                .then(result => {
                    setUserData(result);
                })
                .catch(err => {
                    console.log("error loading user info in root app", err);
                    toast.error(err);
                    removeToken();
                    setUserData(null);
                });
        }).catch(err => {
            toast.error(err);
            setSubmitting(false);
            removeToken();
            setUserData(null);
        });
    };

    return (
        <Container component="main" maxWidth="xs">
            <CssBaseline/>
            <div className={classes.paper}>
                <Avatar className={classes.avatar}>
                    <LockOutlinedIcon/>
                </Avatar>
                <Typography component="h1" variant="h5">
                    Sign in
                </Typography>
                <Formik initialValues={{password: "", username: ""}} onSubmit={handleSubmit}>
                    {({handleSubmit, isSubmitting}) => (
                        <Form onSubmit={handleSubmit}>
                            <input type="hidden" name="remember" value="true"/>
                            <Field
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                component={TextField}
                                type="text"
                                label="Username"
                                name="username"
                            />

                            <Field
                                variant="outlined"
                                margin="normal"
                                required
                                fullWidth
                                component={TextField}
                                type="password"
                                name="password"
                                label="Password"
                            />

                            {isSubmitting && <LinearProgress/>}
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
                                    <Link to="/register" component={RouterLink} variant="body2">
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
