import { createGroup } from "@abrechnung/redux";
import { Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel } from "@mui/material";
import * as React from "react";
import { toast } from "react-toastify";
import { z } from "zod";
import { api } from "@/core/api";
import { useAppDispatch } from "@/store";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FormTextField } from "@abrechnung/components";

const validationSchema = z.object({
    name: z.string({ required_error: "Name is required" }),
    description: z.string().optional(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

const initialValues: FormValues = {
    name: "",
    description: "",
    addUserAccountOnJoin: false,
};

interface Props {
    show: boolean;
    onClose: (reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton") => void;
}

export const GroupCreateModal: React.FC<Props> = ({ show, onClose }) => {
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
                    currency_symbol: "€",
                    terms: "",
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
            })
        )
            .unwrap()
            .then(() => {
                onClose("completed");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <Dialog open={show} onClose={(_, reason) => onClose(reason)}>
            <DialogTitle>Create Group</DialogTitle>
            <DialogContent>
                <form onSubmit={handleSubmit(onSubmit)}>
                    <FormTextField
                        margin="normal"
                        required
                        fullWidth
                        autoFocus
                        variant="standard"
                        type="text"
                        name="name"
                        label="Group Name"
                        control={control}
                    />
                    <FormTextField
                        margin="normal"
                        fullWidth
                        variant="standard"
                        type="text"
                        name="description"
                        label="Description"
                        control={control}
                    />
                    <FormControlLabel
                        label="Automatically add accounts for newly joined group members"
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
                            Save
                        </Button>
                        <Button color="error" onClick={() => onClose("closeButton")}>
                            Cancel
                        </Button>
                    </DialogActions>
                </form>
            </DialogContent>
        </Dialog>
    );
};
