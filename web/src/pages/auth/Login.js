import React, {useEffect, useState} from "react";
import {useHistory} from "react-router-dom";
import {Field, Form, Formik} from "formik";
import {fetchUserData, isAuthenticated, login, sessionToken, userData} from "../../recoil/auth";
import {useRecoilState, useSetRecoilState} from "recoil";
import Loading from "../../components/style/Loading";
import {toast} from "react-toastify";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import {TextField} from "formik-material-ui";
import {Container, CssBaseline, makeStyles} from "@material-ui/core";
import Typography from "@material-ui/core/Typography";
import Avatar from '@material-ui/core/Avatar';
import LockOutlinedIcon from '@material-ui/icons/LockOutlined';

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
    const setSessionToken = useSetRecoilState(sessionToken);
    const [loggedIn, setLoggedIn] = useRecoilState(isAuthenticated);
    const [loading, setLoading] = useState(true);
    const setUserData = useSetRecoilState(userData);
    let history = useHistory();
    const classes = useStyles();

    useEffect(() => {
        if (loggedIn) {
            setLoading(false);
            history.push('/');
        } else {
            setLoading(false);
        }
    }, [loggedIn, history])

    const handleSubmit = (values, {setSubmitting}) => {
        login(values).then(res => {
            toast.success(`Logged in...`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            setLoggedIn(true);
            setSessionToken(res);
            setSubmitting(false);
            fetchUserData({authToken: res}).then(result => {
                setUserData(result);
                history.push("/"); // handle next
            }).catch(err => {
            })
        }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            setSubmitting(false);
        })
    };


    // if (this.props.isAuthenticated) {
    //     let params = queryString.parse(this.props.location.search);
    //     if (params.next !== null && params.next !== undefined && params.next.startsWith("/")) {
    //         return <Redirect to={params.next}/>;
    //     }
    //     return <Redirect to="/"/>;
    // }

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
                        </Form>
                    )}
                </Formik>
            </div>
        </Container>
    );
}
