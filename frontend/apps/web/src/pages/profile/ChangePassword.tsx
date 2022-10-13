import React from "react";
import { Form, Formik } from "formik";
import { changePassword } from "../../core/api";
import { toast } from "react-toastify";
import { Button, LinearProgress, TextField, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";

export const ChangePassword: React.FC = () => {
    useTitle("Abrechnung - Change Password");

    const validate = (values) => {
        const errors = { newPassword: undefined };
        if (values.newPassword !== values.newPassword2) {
            errors.newPassword = "Passwords do not match";
        }
        return errors;
    };

    const handleSubmit = (values, { setSubmitting }) => {
        changePassword({
            oldPassword: values.password,
            newPassword: values.newPassword,
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
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Change Password
            </Typography>
            <Formik
                validate={validate}
                initialValues={{
                    password: "",
                    newPassword: "",
                    newPassword2: "",
                }}
                onSubmit={handleSubmit}
            >
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
                        <Button type="submit" color="primary" disabled={isSubmitting}>
                            Save
                        </Button>
                    </Form>
                )}
            </Formik>
        </MobilePaper>
    );
};

export default ChangePassword;
