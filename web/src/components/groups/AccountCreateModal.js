import React from "react";
import * as yup from "yup";
import {Form, Formik} from "formik";
import {toast} from "react-toastify";
import {createAccount} from "../../api";
import {Button, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, TextField} from "@mui/material";
import {useSetRecoilState} from "recoil";
import {addAccount, groupAccountsRaw} from "../../recoil/groups";

const validationSchema = yup.object({
    name: yup.string("Enter an account name").required("Name is required"),
    description: yup.string("Enter an account description"),
})

export default function AccountCreateModal({show, onClose, group}) {
    const setAccounts = useSetRecoilState(groupAccountsRaw(group.id));

    const handleSubmit = (values, {setSubmitting}) => {
        createAccount({
            groupID: group.id,
            name: values.name,
            description: values.description
        })
            .then(account => {
                toast.success(`Created account ${values.name}`);
                addAccount(account, setAccounts);
                setSubmitting(false);
                onClose();
            })
            .catch(err => {
                toast.error(err);
                setSubmitting(false);
            });
    };
    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Account</DialogTitle>

            <DialogContent>
                <Formik initialValues={{name: "", description: ""}} onSubmit={handleSubmit}
                        validationSchema={validationSchema}>
                    {({values, touched, errors, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
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
                                required
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

                            {isSubmitting && <LinearProgress/>}
                            <DialogActions>
                                <Button color="error" onClick={onClose}>
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    color="primary"
                                    disabled={isSubmitting}
                                    onClick={handleSubmit}
                                >
                                    Save
                                </Button>
                            </DialogActions>
                        </Form>)}
                </Formik>
            </DialogContent>
        </Dialog>
    );
}