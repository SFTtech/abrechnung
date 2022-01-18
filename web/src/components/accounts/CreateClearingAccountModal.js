import * as yup from "yup";
import { Form, Formik } from "formik";
import { toast } from "react-toastify";
import { createAccount } from "../../api";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField } from "@mui/material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser, addAccount, groupAccounts } from "../../recoil/accounts";
import ClearingSharesFormElement from "./ClearingSharesFormElement";

const validationSchema = yup.object({
    name: yup.string("Enter an account name").required("Name is required"),
    description: yup.string("Enter an account description"),
    clearingShares: yup.object(),
});

export default function CreateClearingAccountModal({ show, onClose, group }) {
    const setAccounts = useSetRecoilState(groupAccounts(group.id));
    const accounts = useRecoilValue(accountsSeenByUser(group.id));

    const handleSubmit = (values, { setSubmitting }) => {
        createAccount({
            groupID: group.id,
            name: values.name,
            accountType: "clearing",
            description: values.description,
            clearingShares: values.clearingShares,
        })
            .then((account) => {
                toast.success(`Created account ${values.name}`);
                addAccount(account, setAccounts);
                setSubmitting(false);
                onClose();
            })
            .catch((err) => {
                toast.error(err);
                setSubmitting(false);
            });
    };

    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Clearing Account</DialogTitle>

            <DialogContent>
                <Formik
                    initialValues={{
                        name: "",
                        description: "",
                        clearingShares: accounts.reduce((map, curr) => {
                            map[curr.id] = 0.0;
                            return map;
                        }, {}),
                    }}
                    onSubmit={handleSubmit}
                    validationSchema={validationSchema}
                >
                    {({
                        values,
                        touched,
                        errors,
                        setFieldValue,
                        handleChange,
                        handleBlur,
                        handleSubmit,
                        isSubmitting,
                    }) => (
                        <Form>
                            <TextField
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                variant="standard"
                                name="name"
                                label="Account Name"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.name}
                                error={touched.name && Boolean(errors.name)}
                                helperText={touched.name && errors.name}
                            />
                            <TextField
                                margin="normal"
                                fullWidth
                                variant="standard"
                                name="description"
                                label="Description"
                                onBlur={handleBlur}
                                onChange={handleChange}
                                value={values.description}
                                error={touched.description && Boolean(errors.description)}
                                helperText={touched.description && errors.description}
                            />

                            <ClearingSharesFormElement
                                group={group}
                                clearingShares={values.clearingShares}
                                setClearingShares={(clearingShares) => setFieldValue("clearingShares", clearingShares)}
                            />

                            {isSubmitting && <LinearProgress />}
                            <DialogActions>
                                <Button color="error" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button type="submit" color="primary" disabled={isSubmitting} onClick={handleSubmit}>
                                    Save
                                </Button>
                            </DialogActions>
                        </Form>
                    )}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}
