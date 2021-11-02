import React from "react";
import { Form, Formik } from "formik";
import { changePassword } from "../../api";
import { toast } from "react-toastify";
import { Button, LinearProgress, Paper, TextField, Typography } from "@mui/material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2)
    }
}));

export default function ChangePassword() {
    const classes = useStyles();

    const validate = (values) => {
        let errors = {};
        if (values.newPassword !== values.newPassword2) {
            errors.newPassword = "Passwords do not match";
        }
        return errors;
    };

    const handleSubmit = (values, { setSubmitting }) => {
        changePassword({
            oldPassword: values.password,
            newPassword: values.newPassword
        })
            .then((res) => {
                setSubmitting(false);
                toast.success("Successfully changed password");
            })
            .catch((error) => {
                setSubmitting(false);
                toast.error(error);
            });
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Typography component="h3" variant="h5">
                Change Password
            </Typography>
            <Formik validate={validate} initialValues={{ password: "", newPassword: "", newPassword2: "" }}
                    onSubmit={handleSubmit}>
                {({ values, handleChange, handleBlur, handleSubmit, isSubmitting }) => (
                    <Form>
                        <TextField
                            required
                            fullWidth
                            autoFocus
                            margin="normal"
                            type="password"
                            name="password"
                            label="Password"
                            variant="standard"
                            value={values.password}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />

                        <TextField
                            required
                            fullWidth
                            margin="normal"
                            type="password"
                            name="newPassword"
                            label="New Password"
                            variant="standard"
                            value={values.newPassword}
                            onChange={handleChange}
                            onBlur={handleBlur}
                        />

                        <TextField
                            required
                            fullWidth
                            variant="standard"
                            value={values.newPassword2}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            margin="normal"
                            type="password"
                            name="newPassword2"
                            label="Repeat Password"
                        />

                        {isSubmitting && <LinearProgress />}
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

