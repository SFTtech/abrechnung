import { Form, Formik } from "formik";
import React from "react";
import { toast } from "react-toastify";
import { api } from "../../core/api";
import {
    Button,
    Checkbox,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    LinearProgress,
    TextField,
} from "@mui/material";
import GroupMemberSelect from "../groups/GroupMemberSelect";
import { selectAccountSlice, useAppDispatch, selectGroupSlice, selectAuthSlice, useAppSelector } from "../../store";
import {
    saveAccount,
    selectAccountById,
    selectCurrentUserPermissions,
    selectCurrentUserId,
    selectGroupMemberIdToUsername,
} from "@abrechnung/redux";

interface Props {
    groupId: number;
    show: boolean;
    accountId: number;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const EditAccountModal: React.FC<Props> = ({ groupId, show, onClose, accountId }) => {
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const currentUserId = useAppSelector((state) => selectCurrentUserId({ state: selectAuthSlice(state) }));
    const memberIDToUsername = useAppSelector((state) =>
        selectGroupMemberIdToUsername({ state: selectGroupSlice(state), groupId })
    );

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const dispatch = useAppDispatch();
    // TODO: handle account does not exist

    const handleSubmit = (values, { setSubmitting }) => {
        dispatch(saveAccount({ account: { ...account, ...values }, api: api }))
            .then((res) => {
                console.log(res);
                setSubmitting(false);
                onClose({}, "completed");
            })
            .catch((err) => {
                console.log(err);
                // TODO: determine what we get from error
                toast.error(err);
                setSubmitting(false);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Edit Personal Account</DialogTitle>
            <DialogContent>
                <Formik
                    initialValues={{
                        accountID: account?.id,
                        name: account?.name,
                        description: account?.description,
                        owningUserID: account?.owningUserID,
                    }}
                    onSubmit={handleSubmit}
                    enableReinitialize={true}
                >
                    {({ values, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                variant="standard"
                                autoFocus
                                name="name"
                                label="Account Name"
                                value={values.name}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
                                value={values.description}
                                onBlur={handleBlur}
                                onChange={handleChange}
                            />
                            {permissions.isOwner ? (
                                <GroupMemberSelect
                                    margin="normal"
                                    groupId={groupId}
                                    label="Owning user"
                                    value={values.owningUserID}
                                    onChange={(user_id) => setFieldValue("owningUserID", user_id)}
                                />
                            ) : account?.owningUserID === null || account?.owningUserID === currentUserId ? (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="owningUserID"
                                            onChange={(e) =>
                                                setFieldValue("owningUserID", e.target.checked ? currentUserId : null)
                                            }
                                            checked={values.owningUserID === currentUserId}
                                        />
                                    }
                                    label="This is me"
                                />
                            ) : (
                                <span>
                                    Owned by{" "}
                                    <Chip
                                        size="small"
                                        component="span"
                                        color="primary"
                                        label={memberIDToUsername[account?.owningUserID]}
                                    />
                                </span>
                            )}

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="primary" type="submit">
                                    Save
                                </Button>
                                <Button color="error" onClick={() => onClose({}, "closeButton")}>
                                    Cancel
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
};

export default EditAccountModal;
