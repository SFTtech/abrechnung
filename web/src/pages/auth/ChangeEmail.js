import React from "react";
import {ws} from "../../websocket";
import {useRecoilValue} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {Field, Form, Formik} from "formik";
import Typography from "@material-ui/core/Typography";
import Paper from "@material-ui/core/Paper";
import {TextField} from "formik-material-ui";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function ChangeEmail() {
    const classes = useStyles();
    const token = useRecoilValue(sessionToken);

    const handleSubmit = (values, {setSubmitting}) => {
        ws.call("request_email_change", {
            authtoken: token,
            password: values.password,
            new_email: values.newEmail,
        })
            .then((res) => {
                setSubmitting(false);
            })
            .catch((error) => {
                setSubmitting(false);
            });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Change E-Mail
            </Typography>
            <Formik initialValues={{password: "", newEmail: ""}}
                    onSubmit={handleSubmit}>
                {({handleSubmit, isSubmitting}) => (
                    <Form>
                        <Field
                            required
                            fullWidth
                            margin="normal"
                            autoFocus
                            type="password"
                            name="password"
                            component={TextField}
                            label="Password"
                        />

                        <Field
                            required
                            fullWidth
                            margin="normal"
                            type="email"
                            name="newEmail"
                            component={TextField}
                            label="New E-Mail"
                        />

                        {isSubmitting && <LinearProgress/>}
                        <Button
                            type="submit"
                            color="primary"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                        >
                            Save
                        </Button>
                    </Form>
                )}
            </Formik>
        </Paper>
    );
}

