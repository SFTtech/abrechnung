import { Button, Typography } from "@mui/material";
import React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { MobilePaper } from "@/components/style";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import i18n from "@/i18n";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

const validationSchema = z
    .object({
        password: z.string({ required_error: "password is required" }),
        newPassword: z.string({ required_error: "new password is required" }),
        newPassword2: z.string({ required_error: "please repeat your desired new password" }),
    })
    .refine((data) => data.newPassword === data.newPassword2, {
        message: i18n.t("common.passwordsDoNotMatch"),
        path: ["newPassword2"],
    });
type FormSchema = z.infer<typeof validationSchema>;

export const ChangePassword: React.FC = () => {
    const { t } = useTranslation();
    useTitle(t("profile.changePassword.tabTitle"));

    const {
        control,
        handleSubmit,
        reset: resetForm,
    } = useForm<FormSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            password: "",
            newPassword: "",
            newPassword2: "",
        },
    });

    const onSubmit = (values: FormSchema) => {
        api.client.auth
            .changePassword({ requestBody: { old_password: values.password, new_password: values.newPassword } })
            .then(() => {
                toast.success(t("profile.changePassword.success"));
                resetForm();
            })
            .catch((error) => {
                toast.error(error.toString());
            });
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("profile.changePassword.pageTitle")}
            </Typography>
            <form onSubmit={handleSubmit(onSubmit)}>
                <FormTextField
                    fullWidth
                    autoFocus
                    margin="normal"
                    type="password"
                    name="password"
                    label={t("common.password")}
                    variant="standard"
                    control={control}
                />

                <FormTextField
                    fullWidth
                    margin="normal"
                    type="password"
                    name="newPassword"
                    label={t("profile.changePassword.newPassword")}
                    variant="standard"
                    control={control}
                />

                <FormTextField
                    fullWidth
                    variant="standard"
                    margin="normal"
                    type="password"
                    name="newPassword2"
                    label={t("common.repeatPassword")}
                    control={control}
                />

                <Button type="submit" color="primary">
                    {t("common.save")}
                </Button>
            </form>
        </MobilePaper>
    );
};
