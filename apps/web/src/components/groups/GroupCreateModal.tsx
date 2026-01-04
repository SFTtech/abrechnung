import { createGroup, fetchGroup, fetchGroups } from "@abrechnung/redux";
import {
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
} from "@mui/material";
import * as React from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { api } from "@/core/api";
import { useAppDispatch } from "@/store";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CurrencyIdentifierSelect, FormTextField } from "@abrechnung/components";
import { useTranslation } from "react-i18next";
import { CurrencyIdentifier } from "@abrechnung/core";
import { stringifyError } from "@abrechnung/api";
import { useImportGroupMutation } from "@/core/generated/api";
import { useNavigate } from "react-router";

const validationSchema = z.object({
    name: z.string({ error: (issue) => (issue.input === undefined ? "Name is required" : null) }),
    currency_identifier: z.string(),
    description: z.string().optional(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

const initialValues: FormValues = {
    name: "",
    description: "",
    currency_identifier: "EUR",
    addUserAccountOnJoin: false,
};

interface Props {
    show: boolean;
    onClose: (reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton") => void;
}

const ImportGroupButton = () => {
    const { t } = useTranslation();

    const navigate = useNavigate();
    const dispatch = useAppDispatch();
    const [importGroup] = useImportGroupMutation();

    const selectGroupExportFile: React.ChangeEventHandler<HTMLInputElement> = async (event) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }
        const content = await file.text();
        try {
            const resp = await importGroup({ importGroupPayload: { group_json: content } }).unwrap();
            dispatch(fetchGroup({ api, groupId: resp.group_id }))
                .unwrap()
                .then(() => {
                    navigate(`/groups/${resp.group_id}`);
                });
        } catch (e) {
            toast.error(t("groups.create.importError", { error: stringifyError(e) }));
        }
    };

    return (
        <Box sx={{ justifyContent: "center", display: "flex" }}>
            <label htmlFor="btn-upload">
                <input
                    id="btn-upload"
                    name="btn-upload"
                    style={{ display: "none" }}
                    type="file"
                    accept="application/json"
                    onChange={selectGroupExportFile}
                />
                <Button component="span">{t("groups.create.import")}</Button>
            </label>
        </Box>
    );
};

export const GroupCreateModal: React.FC<Props> = ({ show, onClose }) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const { control, handleSubmit } = useForm<FormValues>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialValues,
    });

    const onSubmit = (values: FormValues) => {
        dispatch(
            createGroup({
                api,
                group: {
                    name: values.name,
                    description: values.description,
                    currency_identifier: values.currency_identifier,
                    terms: "",
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
            })
        )
            .unwrap()
            .then(() => {
                onClose("completed");
                dispatch(fetchGroups({ api }));
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={(_, reason) => onClose(reason)}>
            <DialogTitle>{t("groups.create.title")}</DialogTitle>
            <DialogContent>
                <ImportGroupButton />
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormTextField
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                        variant="standard"
                        type="text"
                        name="name"
                        label={t("common.name")}
                        control={control}
                    />
                    <FormTextField
                        margin="normal"
                        fullWidth
                        variant="standard"
                        type="text"
                        name="description"
                        label={t("common.description")}
                        control={control}
                    />
                    <Controller
                        name="currency_identifier"
                        control={control}
                        render={({ field, fieldState: { error } }) => (
                            <CurrencyIdentifierSelect
                                label={t("common.currency")}
                                value={field.value as CurrencyIdentifier}
                                onChange={(val) => field.onChange(val)}
                                error={!!error}
                                helperText={error?.message}
                            />
                        )}
                    />
                    <FormControlLabel
                        label={t("groups.create.addUserAccountOnJoinDescription")}
                        control={
                            <Controller
                                name="addUserAccountOnJoin"
                                control={control}
                                render={({ field }) => <Checkbox checked={field.value} {...field} />}
                            />
                        }
                    />
                    <DialogActions>
                        <Button type="submit" color="primary">
                            {t("common.save")}
                        </Button>
                        <Button color="error" onClick={() => onClose("closeButton")}>
                            {t("common.cancel")}
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};
