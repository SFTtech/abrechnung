import { DisabledFormControlLabel, DisabledFormTextField } from "@abrechnung/components";
import { api } from "@/core/api";
import { useAppDispatch } from "@/store";
import { Group } from "@abrechnung/api";
import { updateGroup, useCurrentUserPermissions } from "@abrechnung/redux";
import { Cancel, Edit, Save } from "@mui/icons-material";
import { Alert, Button, Checkbox, FormGroup, Grid } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

type SettingsFormProps = {
    group: Group;
};

const validationSchema = z.object({
    name: z.string({ required_error: "group name is required" }),
    description: z.string(),
    terms: z.string(),
    currency_symbol: z.string(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

export const SettingsForm: React.FC<SettingsFormProps> = ({ group }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

    const permissions = useCurrentUserPermissions(group.id);

    const [isEditing, setIsEditing] = React.useState(false);

    const startEdit = () => {
        setIsEditing(true);
    };

    const stopEdit = () => {
        setIsEditing(false);
    };

    const { control, handleSubmit } = useForm<FormValues>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            name: group.name,
            description: group.description,
            terms: group.terms,
            currency_symbol: group.currency_symbol,
            addUserAccountOnJoin: group.add_user_account_on_join,
        },
    });

    const onSubmit: SubmitHandler<FormValues> = (values: FormValues) => {
        if (!group) {
            return;
        }
        dispatch(
            updateGroup({
                group: {
                    id: group.id,
                    name: values.name,
                    description: values.description,
                    currency_symbol: values.currency_symbol,
                    terms: values.terms,
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
                api,
            })
        )
            .unwrap()
            .then(() => {
                setIsEditing(false);
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    if (!permissions || !group) {
        return <Alert severity="error">Error loading group permissions</Alert>;
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <DisabledFormTextField
                variant="standard"
                margin="normal"
                required
                fullWidth
                type="text"
                label={t("common.name")}
                name="name"
                disabled={!permissions.can_write || !isEditing}
                control={control}
            />

            <DisabledFormTextField
                variant="standard"
                margin="normal"
                fullWidth
                type="text"
                name="description"
                label={t("common.description")}
                disabled={!permissions.can_write || !isEditing}
                control={control}
            />
            <DisabledFormTextField
                variant="standard"
                margin="normal"
                required
                fullWidth
                type="text"
                name="currency_symbol"
                label={t("common.currency")}
                disabled={!permissions.can_write || !isEditing}
                control={control}
            />
            <DisabledFormTextField
                variant="standard"
                multiline={true}
                margin="normal"
                fullWidth
                type="text"
                name="terms"
                label={t("groups.settings.terms")}
                disabled={!permissions.can_write || !isEditing}
                control={control}
            />
            <FormGroup>
                <DisabledFormControlLabel
                    control={
                        <Controller
                            name="addUserAccountOnJoin"
                            control={control}
                            render={({ field }) => (
                                <Checkbox
                                    disabled={!permissions.can_write || !isEditing || field.disabled}
                                    onBlur={field.onBlur}
                                    onChange={field.onChange}
                                    checked={field.value}
                                />
                            )}
                        />
                    }
                    label={t("groups.settings.autoAddAccounts")}
                />
            </FormGroup>

            <Grid container justifyContent="space-between" style={{ marginTop: 10 }}>
                <div>
                    {permissions.can_write && isEditing && (
                        <>
                            <Button type="submit" variant="contained" color="primary" startIcon={<Save />}>
                                {t("common.save")}
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={stopEdit}
                                startIcon={<Cancel />}
                                sx={{ ml: 1 }}
                            >
                                {t("common.cancel")}
                            </Button>
                        </>
                    )}
                    {permissions.can_write && !isEditing && (
                        <Button variant="contained" color="primary" onClick={startEdit} startIcon={<Edit />}>
                            {t("common.edit")}
                        </Button>
                    )}
                </div>
            </Grid>
        </form>
    );
};
