import { leaveGroup, selectCurrentUserPermissions, selectGroupById, updateGroup } from "@abrechnung/redux";
import { Cancel, Edit, Save } from "@mui/icons-material";
import {
    Alert,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    FormGroup,
    Grid,
    LinearProgress,
} from "@mui/material";
import { Form, Formik } from "formik";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import * as yup from "yup";
import { DisabledFormControlLabel, DisabledTextField } from "../../components/style/DisabledTextField";
import { MobilePaper } from "../../components/style/mobile";
import { api } from "../../core/api";
import { useTitle } from "../../core/utils";
import { selectGroupSlice, useAppDispatch, useAppSelector } from "../../store";

const validationSchema = yup.object({
    name: yup.string().required("group name is required"),
    description: yup.string(),
    terms: yup.string(),
    currencySymbol: yup.string(),
    addUserAccountOnJoin: yup.boolean(),
});

interface Props {
    groupId: number;
}

export const GroupSettings: React.FC<Props> = ({ groupId }) => {
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const [isEditing, setIsEditing] = useState(false);

    useTitle(`${group.name} - Settings`);

    const startEdit = () => {
        setIsEditing(true);
    };

    const stopEdit = () => {
        setIsEditing(false);
    };

    const handleSubmit = (values, { setSubmitting }) => {
        dispatch(
            updateGroup({
                group: {
                    id: group.id,
                    name: values.name,
                    description: values.description,
                    currency_symbol: values.currencySymbol,
                    terms: values.terms,
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
                api,
            })
        )
            .unwrap()
            .then((res) => {
                setSubmitting(false);
                setIsEditing(false);
            })
            .catch((err) => {
                setSubmitting(false);
                toast.error(err);
            });
    };

    const confirmLeaveGroup = () => {
        dispatch(leaveGroup({ groupId, api }))
            .unwrap()
            .then((res) => {
                navigate("/");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    return (
        <MobilePaper>
            {permissions.isOwner ? (
                <Alert severity="info">You are an owner of this group</Alert>
            ) : !permissions.canWrite ? (
                <Alert severity="info">You only have read access to this group</Alert>
            ) : null}

            <Formik
                initialValues={{
                    name: group.name,
                    description: group.description,
                    terms: group.terms,
                    currencySymbol: group.currency_symbol,
                    addUserAccountOnJoin: group.add_user_account_on_join,
                }}
                onSubmit={handleSubmit}
                validationSchema={validationSchema}
                enableReinitialize={true}
            >
                {({ values, handleBlur, handleChange, handleSubmit, isSubmitting }) => (
                    <Form onSubmit={handleSubmit}>
                        <DisabledTextField
                            variant="standard"
                            margin="normal"
                            required
                            fullWidth
                            type="text"
                            label="Name"
                            name="name"
                            disabled={!permissions.canWrite || !isEditing}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.name}
                        />

                        <DisabledTextField
                            variant="standard"
                            margin="normal"
                            fullWidth
                            type="text"
                            name="description"
                            label="Description"
                            disabled={!permissions.canWrite || !isEditing}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.description}
                        />
                        <DisabledTextField
                            variant="standard"
                            margin="normal"
                            required
                            fullWidth
                            type="text"
                            name="currencySymbol"
                            label="Currency"
                            disabled={!permissions.canWrite || !isEditing}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.currencySymbol}
                        />
                        <DisabledTextField
                            variant="standard"
                            multiline={true}
                            margin="normal"
                            fullWidth
                            type="text"
                            name="terms"
                            label="Terms"
                            disabled={!permissions.canWrite || !isEditing}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.terms}
                        />
                        <FormGroup>
                            <DisabledFormControlLabel
                                control={
                                    <Checkbox
                                        name="addUserAccountOnJoin"
                                        disabled={!permissions.canWrite || !isEditing}
                                        onBlur={handleBlur}
                                        onChange={handleChange}
                                        checked={values.addUserAccountOnJoin}
                                    />
                                }
                                label="Automatically add accounts for newly joined group members"
                            />
                        </FormGroup>

                        {isSubmitting && <LinearProgress />}
                        <Grid container justifyContent="space-between" style={{ marginTop: 10 }}>
                            <div>
                                {permissions.canWrite && isEditing && (
                                    <>
                                        <Button
                                            type="submit"
                                            variant="contained"
                                            color="primary"
                                            disabled={isSubmitting}
                                            startIcon={<Save />}
                                        >
                                            Save
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            disabled={isSubmitting}
                                            onClick={stopEdit}
                                            startIcon={<Cancel />}
                                            sx={{ ml: 1 }}
                                        >
                                            Cancel
                                        </Button>
                                    </>
                                )}
                                {permissions.canWrite && !isEditing && (
                                    <Button
                                        variant="contained"
                                        color="primary"
                                        disabled={isSubmitting}
                                        onClick={startEdit}
                                        startIcon={<Edit />}
                                    >
                                        Edit
                                    </Button>
                                )}
                            </div>
                            <Button variant="contained" onClick={() => setShowLeaveModal(true)}>
                                Leave Group
                            </Button>
                        </Grid>
                    </Form>
                )}
            </Formik>

            {/*<List>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Created" secondary={group.created}/>*/}
            {/*    </ListItem>*/}
            {/*    <ListItem>*/}
            {/*        <ListItemText primary="Joined" secondary={group.joined}/>*/}
            {/*    </ListItem>*/}
            {/*</List>*/}

            <Dialog open={showLeaveModal} onClose={() => setShowLeaveModal(false)}>
                <DialogTitle>Leave Group</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>
                            Are you sure you want to leave the group {group.name}. If you are the last member to leave
                            this group it will be deleted and its transaction will be lost forever...
                        </span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="secondary" onClick={confirmLeaveGroup}>
                        Yes pls
                    </Button>
                    <Button color="primary" onClick={() => setShowLeaveModal(false)}>
                        No
                    </Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
};

export default GroupSettings;
