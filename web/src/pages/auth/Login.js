import React, {useEffect, useState} from "react";
import {Link as RouterLink, useHistory} from "react-router-dom";
import {Field, Form, Formik} from "formik";
import {isAuthenticated} from "../../recoil/auth";
import {useRecoilState} from "recoil";
import Loading from "../../components/style/Loading";
import {toast} from "react-toastify";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import {TextField} from "formik-material-ui";
import {Container, CssBaseline, makeStyles} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import Avatar from '@material-ui/core/Avatar';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';
import {login} from "../../api";
import Grid from "@material-ui/core/Grid";
import Link from "@material-ui/core/Link";

const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    avatar: {
        margin: theme.spacing(1),
        backgroundColor: theme.palette.secondary.main,
    },
    form: {
        width: '100%', // Fix IE 11 issue.
        marginTop: theme.spacing(1),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));

export default function Login() {
    const [loggedIn, setLoggedIn] = useRecoilState(isAuthenticated);
    const [loading, setLoading] = useState(true);
    let history = useHistory();
    const classes = useStyles();

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            history.push('/'); // TODO: handle next page on redirect
        } else {
            setLoading(false);
        }
    }, [loggedIn, history])

    const handleSubmit = (values, {setSubmitting}) => {
        login(values).then(res => {
            toast.success(`Logged in...`);
            setSubmitting(false);
            setLoggedIn(true);
        }).catch(err => {
            toast.error(`${err}`);
            setSubmitting(false);
            setLoggedIn(false);
        })
    };

    if (loading) {
        return <Loading/>
    }

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
                        </Form>
                    )}
                </Formik>
            </div>
        </Container>
    );
}
