import { DisabledFormControlLabel, DisabledFormTextField, DisabledTextField } from "@abrechnung/components";
import { api } from "@/core/api";
import { useAppDispatch } from "@/store";
import { Group } from "@abrechnung/api";
import { updateGroup } from "@abrechnung/redux";
import { Cancel, Edit, Save } from "@mui/icons-material";
import { Alert, Button, Checkbox, FormGroup, Grid, Stack } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";
import { z } from "zod";
import { Controller, SubmitHandler, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { getCurrencySymbolForIdentifier } from "@abrechnung/core";

type SettingsFormProps = {
    group: Group;
};

const validationSchema = z.object({
    name: z.string({ error: (issue) => (issue.input === undefined ? "group name is required" : null) }),
    description: z.string(),
    terms: z.string(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

export const SettingsForm: React.FC<SettingsFormProps> = ({ group }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();

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

    if (!group) {
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
                disabled={!group.can_write || !isEditing}
                control={control}
            />
            <DisabledFormTextField
                variant="standard"
                margin="normal"
                fullWidth
                type="text"
                name="description"
                label={t("common.description")}
                disabled={!group.can_write || !isEditing}
                control={control}
            />

            <DisabledTextField
                variant="standard"
                margin="normal"
                fullWidth
                type="text"
                label={t("common.currency")}
                disabled={true}
                value={`${group.currency_identifier} (${getCurrencySymbolForIdentifier(group.currency_identifier)})`}
            />

            <DisabledFormTextField
                variant="standard"
                multiline={true}
                margin="normal"
                fullWidth
                type="text"
                name="terms"
                label={t("groups.settings.terms")}
                disabled={!group.can_write || !isEditing}
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
                                    disabled={!group.can_write || !isEditing || field.disabled}
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
                    {group.is_owner && isEditing && (
                        <Stack spacing={1} direction="row">
                            <Button type="submit" variant="contained" color="primary" startIcon={<Save />}>
                                {t("common.save")}
                            </Button>
                            <Button variant="contained" color="error" onClick={stopEdit} startIcon={<Cancel />}>
                                {t("common.cancel")}
                            </Button>
                        </Stack>
                    )}
                    {group.is_owner && !isEditing && (
                        <Button variant="contained" color="primary" onClick={startEdit} startIcon={<Edit />}>
                            {t("common.edit")}
                        </Button>
                    )}
                </div>
            </Grid>
        </form>
    );
};
