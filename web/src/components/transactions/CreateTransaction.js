import React from "react";
import {useHistory} from "react-router-dom";
import {toast} from "react-toastify";
import {useRecoilValue, useResetRecoilState} from "recoil";
import {sessionToken} from "../../recoil/auth";
import {createTransaction, groupTransactions} from "../../recoil/transactions";
import {Field, Form, Formik} from "formik";
import {Select, TextField} from "formik-material-ui";
import Button from "@material-ui/core/Button";
import LinearProgress from "@material-ui/core/LinearProgress";
import FormControl from "@material-ui/core/FormControl";
import InputLabel from "@material-ui/core/InputLabel";
import MenuItem from "@material-ui/core/MenuItem";
import Paper from "@material-ui/core/Paper";
import {makeStyles} from "@material-ui/core";

const useStyles = makeStyles((theme) => ({
    paper: {
        padding: theme.spacing(2),
    },
}));

export default function CreateTransaction({group}) {
    const classes = useStyles();
    const reloadTransactions = useResetRecoilState(groupTransactions({groupID: group.group_id}));
    const token = useRecoilValue(sessionToken);
    const history = useHistory();

    const handleSubmit = (values, {setSubmitting}) => {
        createTransaction({
            sessionToken: token,
            groupID: group.group_id,
            type: values.type,
            description: values.description,
            value: values.value,
            currencySymbol: "€",
            currencyConversionRate: 1.0
        })
            .then(result => {
                toast.success(`Created transaction`, {
                    position: "top-right",
                    autoClose: 5000,
                });
                // TODO: make this return the actual thingy
                setSubmitting(false);
                reloadTransactions();
                // TODO: use useRecoilCallback to wait for a reload
                // TODO: set timeout on if loadable to redirect
                history.push(`/groups/${group.group_id}/transactions/${result.transaction_id}`)
            }).catch(err => {
            toast.error(`${err}`, {
                position: "top-right",
                autoClose: 5000,
            });
            setSubmitting(false);
        })
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Formik initialValues={{type: "purchase", description: "", value: "0.0"}} onSubmit={handleSubmit}>
                {({values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting}) => (
                    <Form>
                        <FormControl>
                            <InputLabel>Type</InputLabel>
                            <Field
                                margin="normal"
                                required
                                fullWidth
                                autoFocus
                                component={Select}
                                name="type"
                            >
                                <MenuItem value="purchase">Purchase</MenuItem>
                                <MenuItem value="transfer">Transfer</MenuItem>
                                <MenuItem value="mimo">MIMO</MenuItem>
                            </Field>
                        </FormControl>
                        <Field
                            margin="normal"
                            required
                            fullWidth
                            component={TextField}
                            name="description"
                            label="Description"
                        />
                        <Field
                            margin="normal"
                            required
                            fullWidth
                            type="number"
                            component={TextField}
                            name="value"
                            label="Value"
                        />
                        {isSubmitting && <LinearProgress/>}
                        <Button
                            type="submit"
                            color="primary"
                            disabled={isSubmitting}
                            onClick={handleSubmit}
                        >
                            Create
                        </Button>
                    </Form>)}
            </Formik>
        </Paper>
    );
}
