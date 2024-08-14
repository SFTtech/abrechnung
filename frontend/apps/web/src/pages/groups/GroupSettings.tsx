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
import { Form, Formik, FormikHelpers } from "formik";
import React, { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { z } from "zod";
import { DisabledFormControlLabel, DisabledTextField } from "@/components/style/DisabledTextField";
import { MobilePaper } from "@/components/style/mobile";
import { api } from "@/core/api";
import { useTitle } from "@/core/utils";
import { selectGroupSlice, useAppDispatch, useAppSelector } from "@/store";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { useTranslation } from "react-i18next";

const validationSchema = z.object({
    name: z.string({ required_error: "group name is required" }),
    description: z.string(),
    terms: z.string(),
    currency_symbol: z.string(),
    addUserAccountOnJoin: z.boolean(),
});

type FormValues = z.infer<typeof validationSchema>;

interface Props {
    groupId: number;
}

export const GroupSettings: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const navigate = useNavigate();
    const dispatch = useAppDispatch();

    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));

    const [isEditing, setIsEditing] = useState(false);

    useTitle(t("groups.settings.tabTitle", "", { groupName: group?.name }));

    const startEdit = () => {
        setIsEditing(true);
    };

    const stopEdit = () => {
        setIsEditing(false);
    };

    const handleSubmit = (values: FormValues, { setSubmitting }: FormikHelpers<FormValues>) => {
        if (!group) {
            return;
        }
        dispatch(
            updateGroup({
                group: {
                    id: group.id,
                    name: values.name,
                    description: values.description,
                    currency_symbol: values.currency_symbol,
                    terms: values.terms,
                    add_user_account_on_join: values.addUserAccountOnJoin,
                },
                api,
            })
        )
            .unwrap()
            .then(() => {
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
            .then(() => {
                navigate("/");
            })
            .catch((err) => {
                toast.error(err);
            });
    };

    if (!permissions || !group) {
        return <Navigate to="/404" />;
    }

    return (
        <MobilePaper>
            {permissions.isOwner ? (
                <Alert severity="info">{t("groups.settings.ownerDisclaimer")}</Alert>
            ) : !permissions.canWrite ? (
                <Alert severity="info">{t("groups.settings.readAccessDisclaimer")}</Alert>
            ) : null}

            <Formik
                initialValues={{
                    name: group.name,
                    description: group.description,
                    terms: group.terms,
                    currency_symbol: group.currency_symbol,
                    addUserAccountOnJoin: group.add_user_account_on_join,
                }}
                onSubmit={handleSubmit}
                validationSchema={toFormikValidationSchema(validationSchema)}
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
                            label={t("common.name")}
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
                            label={t("common.description")}
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
                            name="currency_symbol"
                            label={t("common.currency")}
                            disabled={!permissions.canWrite || !isEditing}
                            onBlur={handleBlur}
                            onChange={handleChange}
                            value={values.currency_symbol}
                        />
                        <DisabledTextField
                            variant="standard"
                            multiline={true}
                            margin="normal"
                            fullWidth
                            type="text"
                            name="terms"
                            label={t("groups.settings.terms")}
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
                                label={t("groups.settings.autoAddAccounts")}
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
                                            {t("common.save")}
                                        </Button>
                                        <Button
                                            variant="contained"
                                            color="error"
                                            disabled={isSubmitting}
                                            onClick={stopEdit}
                                            startIcon={<Cancel />}
                                            sx={{ ml: 1 }}
                                        >
                                            {t("common.cancel")}
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
                                        {t("common.edit")}
                                    </Button>
                                )}
                            </div>
                            <Button variant="contained" onClick={() => setShowLeaveModal(true)}>
                                {t("groups.settings.leaveGroup")}
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
                <DialogTitle>{t("groups.settings.leaveGroup")}</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        <span>{t("groups.settings.leaveGroupConfirm", "", { group })}</span>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button color="secondary" onClick={confirmLeaveGroup}>
                        {t("common.yes")}
                    </Button>
                    <Button color="primary" onClick={() => setShowLeaveModal(false)}>
                        {t("common.no")}
                    </Button>
                </DialogActions>
            </Dialog>
        </MobilePaper>
    );
};
