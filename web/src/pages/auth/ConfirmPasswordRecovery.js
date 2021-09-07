import React, {useState} from "react";
import {Link as RouterLink, useParams} from "react-router-dom";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import {confirmPasswordRecovery} from "../../api";
import Container from "@material-ui/core/Container";
import CssBaseline from "@material-ui/core/CssBaseline";
import {Field, Form, Formik} from "formik";
import {TextField} from "formik-material-ui";
import LinearProgress from "@material-ui/core/LinearProgress";
import {makeStyles} from "@material-ui/core";
import Alert from "@material-ui/lab/Alert";
import Link from "@material-ui/core/Link";

const useStyles = makeStyles((theme) => ({
    paper: {
        marginTop: theme.spacing(8),
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
    },
    submit: {
        margin: theme.spacing(3, 0, 2),
    },
    alert: {
        marginTop: theme.spacing(4)
    }
}));

export default function ConfirmPasswordRecovery() {
    const [status, setStatus] = useState("idle");
    const [error, setError] = useState(null);
    const {token} = useParams();
    const classes = useStyles();

    const handleSubmit = (values, {setSubmitting}) => {
        confirmPasswordRecovery({newPassword: values.password, token: token})
            .then(res => {
                setStatus("success");
                setError(null);
                setSubmitting(false);
            })
            .catch(err => {
                setStatus("error");
                setError(err);
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
        <Container maxWidth="xs">
            <CssBaseline/>
            <div className={classes.paper}>
                <Typography component="h1" variant="h5">
                    Confirm Password Recovery
                </Typography>
                {error && (
                    <Alert className={classes.alert} severity="error">{error}</Alert>
                )}
                {status === "success" ? (
                    <Alert className={classes.alert} severity="success">Password recovery successful, please <Link to="/login"
                                                                                         component={RouterLink}>login</Link> using
                        your new password.</Alert>
                ) : (
                    <Formik
                        validate={validate}
                        initialValues={{
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
                                    Confirm
                                </Button>
                            </Form>
                        )}
                    </Formik>
                )}
            </div>
        </Container>
    );
}
