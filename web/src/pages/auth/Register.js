import React, {useEffect, useState} from "react";
import {Link as RouterLink, useHistory} from "react-router-dom";
import {Field, Form, Formik} from "formik";

import {useRecoilValue} from "recoil";
import {isAuthenticated} from "../../recoil/auth";
import {register} from "../../api";
import {toast} from "react-toastify";
import Loading from "../../components/style/Loading";
import {TextField} from "formik-mui";
import {
    Avatar,
    Button,
    Container,
    CssBaseline,
    Grid,
    LinearProgress,
    Link,
    Typography
} from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

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
        marginTop: theme.spacing(3),
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
}));

export default function Register() {
    const classes = useStyles();
    const loggedIn = useRecoilValue(isAuthenticated);
    const [loading, setLoading] = useState(true);
    let history = useHistory();

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            history.push('/');
        } else {
            setLoading(false);
        }
    }, [loggedIn, history])

    const handleSubmit = (values, {setSubmitting}) => {
        register(values).then(res => {
            toast.success(`Registered successfully, please confirm your email before logging in...`, {autoClose: 20000});
            setSubmitting(false);
            history.push('/login');
        }).catch(err => {
            toast.error(err);
            setSubmitting(false);
        })
    };

    const validate = (values) => {
        let errors = {};
        if (values.password !== values.password2) {
            errors.password2 = "Passwords do not match";
        }
        return errors;
    }

    return (
        <>
            {loading ? <Loading/> : (<>
                <Container maxWidth="xs">
                    <CssBaseline/>
                    <div className={classes.paper}>
                        <Avatar className={classes.avatar}>
                            <LockOutlined/>
                        </Avatar>
                        <Typography component="h1" variant="h5">
                            Register a new account
                        </Typography>
                        <Formik
                            validate={validate}
                            initialValues={{
                                username: "",
                                email: "",
                                password: "",
                                password2: "",
                            }}
                            onSubmit={handleSubmit}
                        >
                            {({handleSubmit, isSubmitting}) => (

                                <Form>
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
                                        type="email"
                                        name="email"
                                        label="E-Mail"
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

                                    <Field
                                        variant="outlined"
                                        margin="normal"
                                        required
                                        fullWidth
                                        component={TextField}
                                        type="password"
                                        name="password2"
                                        label="Repeat Password"
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
                                        Register
                                    </Button>
                                    <Grid container justify="flex-end">
                                        <Grid item>
                                            <Link to="/login" component={RouterLink} variant="body2">
                                                Already have an account? Sign in
                                            </Link>
                                        </Grid>
                                    </Grid>
                                </Form>
                            )}
                        </Formik>
                    </div>
                </Container>

            </>)}
        </>
    )
}
