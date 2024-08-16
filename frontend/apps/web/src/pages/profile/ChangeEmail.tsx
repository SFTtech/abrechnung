import { toFormikValidationSchema } from "@abrechnung/utils";
import { Button, LinearProgress, TextField, Typography } from "@mui/material";
import { Form, Formik, FormikHelpers, FormikProps } from "formik";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { MobilePaper } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";

const validationSchema = z.object({
    password: z.string({ required_error: "password is required" }),
    newEmail: z.string({ required_error: "email is required" }).email("please enter a valid email"),
});
type FormSchema = z.infer<typeof validationSchema>;

export const ChangeEmail: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t("profile.changeEmail.tabTitle"));

    const handleSubmit = (values: FormSchema, { setSubmitting, resetForm }: FormikHelpers<FormSchema>) => {
        api.client.auth
            .changeEmail({ requestBody: { password: values.password, email: values.newEmail } })
            .then(() => {
                setSubmitting(false);
                toast.success(t("profile.changeEmail.success"));
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
                {t("profile.changeEmail.pageTitle")}
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
                            label={t("common.password")}
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
                            label={t("profile.changeEmail.newEmail")}
                            error={touched.newEmail && !!errors.newEmail}
                            helperText={touched.newEmail && errors.newEmail}
                        />

                        {isSubmitting && <LinearProgress />}
                        <Button type="submit" color="primary" disabled={isSubmitting}>
                            {t("common.save")}
                        </Button>
                    </Form>
                )}
            </Formik>
        </MobilePaper>
    );
};
