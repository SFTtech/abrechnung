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
import { groupAccounts, updateAccount } from "../../state/accounts";
import { Group, Account } from "@abrechnung/types";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { userData } from "../../state/auth";
import { currUserPermissions, groupMemberIDsToUsername } from "../../state/groups";
import GroupMemberSelect from "../groups/GroupMemberSelect";

interface Props {
    group: Group;
    show: boolean;
    account: Account;
    onClose: (
        event: Record<string, never>,
        reason: "escapeKeyDown" | "backdropClick" | "completed" | "closeButton"
    ) => void;
}

export const EditAccountModal: React.FC<Props> = ({ group, show, onClose, account }) => {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const userPermissions = useRecoilValue(currUserPermissions(group.id));
    const currentUser = useRecoilValue(userData);
    const memberIDToUsername = useRecoilValue(groupMemberIDsToUsername(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        api.updateAccountDetails(values.accountID, values.name, values.description, values.owningUserID, null)
            .then((account) => {
                console.log(account);
                updateAccount(account, setAccounts);
                setSubmitting(false);
                onClose({}, "completed");
            })
            .catch((err) => {
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
                            {userPermissions.isOwner ? (
                                <GroupMemberSelect
                                    margin="normal"
                                    group={group}
                                    label="Owning user"
                                    value={values.owningUserID}
                                    onChange={(user_id) => setFieldValue("owningUserID", user_id)}
                                />
                            ) : account?.owningUserID === null || account?.owningUserID === currentUser.id ? (
                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            name="owningUserID"
                                            onChange={(e) =>
                                                setFieldValue("owningUserID", e.target.checked ? currentUser.id : null)
                                            }
                                            checked={values.owningUserID === currentUser.id}
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
