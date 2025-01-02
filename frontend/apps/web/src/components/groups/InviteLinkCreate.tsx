import { Group } from "@abrechnung/api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { DateTimePicker } from "@mui/x-date-pickers";
import { DateTime } from "luxon";
import React from "react";
import { toast } from "react-toastify";
import { api } from "@/core/api";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { FormCheckbox, FormTextField } from "@abrechnung/components";
import { useTranslation } from "react-i18next";

interface Props {
    group: Group;
    show: boolean;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

const validationSchema = z.object({
    description: z.string(),
    singleUse: z.boolean(),
    joinAsEditor: z.boolean(),
    validUntil: z.string().datetime({ offset: true }),
});

type FormValues = z.infer<typeof validationSchema>;
const nowPlusOneHour = () => {
    return DateTime.now().plus({ hours: 1 });
};

export const InviteLinkCreate: React.FC<Props> = ({ show, onClose, group }) => {
    const { t } = useTranslation();
    const { control, handleSubmit } = useForm<FormValues>({
        resolver: zodResolver(validationSchema),
        defaultValues: {
            description: "",
            validUntil: nowPlusOneHour().toISO(),
            singleUse: false,
            joinAsEditor: false,
        },
    });

    const onSubmit = (values: FormValues) => {
        api.client.groups
            .createInvite({
                groupId: group.id,
                requestBody: {
                    description: values.description,
                    valid_until: values.validUntil,
                    single_use: values.singleUse,
                    join_as_editor: values.joinAsEditor,
                },
            })
            .then(() => {
                toast.success(t("groups.invites.createdSuccessfully"));
                onClose({}, "completed");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Invite Link</DialogTitle>

            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <Stack spacing={2}>
                        <FormTextField
                            margin="normal"
                            required
                            fullWidth
                            autoFocus
                            variant="standard"
                            name="description"
                            label={t("common.description")}
                            control={control}
                        />
                        <Controller
                            name="validUntil"
                            control={control}
                            render={({ field: { onChange, value } }) => (
                                <DateTimePicker
                                    format="yyyy-MM-dd HH:mm"
                                    label={t("groups.invites.validUntil")}
                                    value={DateTime.fromISO(value)}
                                    onChange={(val) => {
                                        if (val != null && val.isValid) {
                                            onChange(val.toISO());
                                            console.log(val.toISO());
                                        }
                                    }}
                                    slotProps={{
                                        textField: {
                                            variant: "standard",
                                            fullWidth: true,
                                        },
                                    }}
                                />
                            )}
                        />
                        <FormCheckbox label={t("groups.invites.singleUse")} control={control} name="singleUse" />
                        <FormCheckbox
                            label={t("groups.invites.newMembersJoinAsEditors")}
                            control={control}
                            name="joinAsEditor"
                        />

                        <DialogActions>
                            <Button type="submit" color="primary">
                                {t("common.save")}
                            </Button>
                            <Button color="error" onClick={() => onClose({}, "closeButton")}>
                                {t("common.cancel")}
                            </Button>
                        </DialogActions>
                    </Stack>
                </form>
            </DialogContent>
        </Dialog>
    );
};

export default InviteLinkCreate;
