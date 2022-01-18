import React from "react";
import { Form, Formik } from "formik";
import { changeEmail } from "../../api";
import { toast } from "react-toastify";
import { Button, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function ChangeEmail() {
    const classes = useStyles();

    const handleSubmit = (values, { setSubmitting }) => {
        changeEmail({
            password: values.password,
            newEmail: values.newEmail,
        })
            .then((res) => {
                setSubmitting(false);
                toast.success("Requested email change, you should receive an email with a confirmation link soon");
            })
            .catch((error) => {
                setSubmitting(false);
                toast.error(error);
            });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Change E-Mail
            </Typography>
            <Formik initialValues={{ password: "", newEmail: "" }} onSubmit={handleSubmit}>
                {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                    <Form>
                        <TextField
                            required
                            fullWidth
                            margin="normal"
                            autoFocus
                            type="password"
                            name="password"
                            variant="standard"
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="Password"
                        />

                        <TextField
                            required
                            fullWidth
                            margin="normal"
                            type="email"
                            name="newEmail"
                            variant="standard"
                            value={values.newEmail}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="New E-Mail"
                        />

                        {isSubmitting && <LinearProgress />}
                        <Button type="submit" color="primary" disabled={isSubmitting} onClick={handleSubmit}>
                            Save
                        </Button>
                    </Form>
                )}
            </Formik>
        </Paper>
    );
}
