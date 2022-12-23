import React from "react";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import { api } from "../../core/api";
import { toast } from "react-toastify";
import { Button, LinearProgress, TextField, Typography } from "@mui/material";
import { MobilePaper } from "../../components/style/mobile";
import { useTitle } from "../../core/utils";
import { z } from "zod";
import { toFormikValidationSchema } from "@abrechnung/utils";

const validationSchema = z.object({
    password: z.string({ required_error: "password is required" }),
    newEmail: z.string({ required_error: "email is required" }).email("please enter a valid email"),
});
type FormSchema = z.infer<typeof validationSchema>;

export const ChangeEmail: React.FC = () => {
    useTitle("Abrechnung - Change E-Mail");

    const handleSubmit = (values: FormSchema, { setSubmitting, resetForm }: FormikHelpers<FormSchema>) => {
        api.changeEmail({ password: values.password, newEmail: values.newEmail })
            .then(() => {
                setSubmitting(false);
                toast.success("Requested email change, you should receive an email with a confirmation link soon");
                resetForm();
            })
            .catch((error) => {
                setSubmitting(false);
                toast.error(error.toString());
            });
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                Change E-Mail
            </Typography>
            <Formik
                validationSchema={toFormikValidationSchema(validationSchema)}
                initialValues={{ password: "", newEmail: "" }}
                onSubmit={handleSubmit}
            >
                {({ values, handleChange, handleBlur, isSubmitting, errors, touched }: FormikProps<FormSchema>) => (
                    <Form>
                        <TextField
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
                            error={touched.password && !!errors.password}
                            helperText={touched.password && errors.password}
                        />

                        <TextField
                            fullWidth
                            margin="normal"
                            type="email"
                            name="newEmail"
                            variant="standard"
                            value={values.newEmail}
                            onChange={handleChange}
                            onBlur={handleBlur}
                            label="New E-Mail"
                            error={touched.newEmail && !!errors.newEmail}
                            helperText={touched.newEmail && errors.newEmail}
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

export default ChangeEmail;
