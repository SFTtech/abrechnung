import { Button, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { MobilePaper } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

const validationSchema = z.object({
    password: z.string({ required_error: "password is required" }),
    newEmail: z.string({ required_error: "email is required" }).email("please enter a valid email"),
});
type FormSchema = z.infer<typeof validationSchema>;

export const ChangeEmail: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t("profile.changeEmail.tabTitle"));

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            password: "",
            newEmail: "",
        },
    });

    const onSubmit = (values: FormSchema) => {
        api.client.auth
            .changeEmail({ requestBody: { password: values.password, email: values.newEmail } })
            .then(() => {
                toast.success(t("profile.changeEmail.success"));
                resetForm();
            })
            .catch((error) => {
                toast.error(error.toString());
            });
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("profile.changeEmail.pageTitle")}
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormTextField
                    fullWidth
                    margin="normal"
                    autoFocus
                    type="password"
                    name="password"
                    variant="standard"
                    label={t("common.password")}
                    control={control}
                />

                <FormTextField
                    fullWidth
                    margin="normal"
                    type="email"
                    name="newEmail"
                    variant="standard"
                    label={t("profile.changeEmail.newEmail")}
                    control={control}
                />

                <Button type="submit" color="primary">
                    {t("common.save")}
                </Button>
            </form>
        </MobilePaper>
    );
};
