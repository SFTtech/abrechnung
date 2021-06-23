import React from "react";
import {Field, Form, Formik} from "formik";
import {createAccount, groupAccounts} from "../../recoil/groups";
import {toast} from "react-toastify";
import {useRecoilValue, useSetRecoilState} from "recoil";
import {sessionToken} from "../../recoil/auth";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import DialogActions from "@material-ui/core/DialogActions";
import LinearProgress from "@material-ui/core/LinearProgress";
import {TextField} from "formik-material-ui";

export default function AccountCreateModal({show, onClose, group}) {
    const token = useRecoilValue(sessionToken);
    const setAccounts = useSetRecoilState(groupAccounts(group.group_id));

    const handleSubmit = (values, {setSubmitting}) => {
        createAccount({
            sessionToken: token,
            groupID: group.group_id,
            name: values.name,
            description: values.description
        })
            .then(result => {
                toast.success(`Created account ${values.name}`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                setAccounts((oldAccounts) => [
                    ...oldAccounts,
                    result
                ])
                setSubmitting(false);
                onClose();
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
            setSubmitting(false);
        })
    };
    return (
        <Dialog open={show} onClose={onClose}>
            <DialogTitle>Create Account</DialogTitle>

            <DialogContent>
                <Formik initialValues={{name: "", description: ""}} onSubmit={handleSubmit}>
                    {({handleSubmit, isSubmitting}) => (
                        <Form>
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                component={TextField}
                                name="name"
                                label="Account Name"
                            />
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                component={TextField}
                                name="description"
                                label="Description"
                            />

                            {isSubmitting && <LinearProgress/>}
                            <DialogActions>
                                <Button color="secondary" onClick={onClose}>
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
    )
}