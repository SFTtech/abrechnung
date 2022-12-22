import {
    accountEditStarted,
    discardAccountChange,
    saveAccount,
    selectAccountById,
    selectCurrentUserPermissions,
    wipAccountUpdated,
} from "@abrechnung/redux";
import { AccountValidator } from "@abrechnung/types";
import { toFormikValidationSchema } from "@abrechnung/utils";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import { Button, Chip, Divider, Grid, IconButton, LinearProgress } from "@mui/material";
import { useFormik } from "formik";
import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { DeleteAccountModal } from "../../components/accounts/DeleteAccountModal";
import { DateInput } from "../../components/DateInput";
import { DisabledTextField } from "../../components/style/DisabledTextField";
import { TagSelector } from "../../components/TagSelector";
import { api } from "../../core/api";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";
import { ClearingShares } from "./ClearingShares";

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountInfo: React.FC<Props> = ({ groupId, accountId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);

    const openDeleteDialog = () => setConfirmDeleteDialogOpen(true);
    const onCloseDeleteDialog = () => setConfirmDeleteDialogOpen(false);

    const onAccountDeleted = () => {
        navigate(`/groups/${groupId}/${account.type === "personal" ? "accounts" : "events"}`);
    };

    const accountTypeLabel = account.type === "clearing" ? "event" : "account";

    const edit = () => {
        if (!account.isWip) {
            dispatch(accountEditStarted({ groupId, accountId }));
        }
    };

    const formik = useFormik({
        initialValues:
            account === undefined
                ? {}
                : account.type === "clearing"
                ? {
                      type: account.type,
                      name: account.name,
                      description: account.description,
                      clearingShares: account.clearingShares,
                      dateInfo: account.dateInfo,
                      tags: account.tags,
                  }
                : {
                      type: account.type,
                      name: account.name,
                      description: account.description,
                      owningUserID: account.owningUserID,
                  },
        validationSchema: toFormikValidationSchema(AccountValidator),
        onSubmit: (values, { setSubmitting }) => {
            if (!account || !account.isWip) {
                toast.error("Cannot save as there are not changes made");
                return;
            }

            setSubmitting(true);
            dispatch(wipAccountUpdated({ ...account, ...values }));
            dispatch(saveAccount({ groupId: groupId, accountId: account.id, api }))
                .unwrap()
                .then(({ oldAccountId, account }) => {
                    setSubmitting(false);
                    if (oldAccountId !== account.id) {
                        navigate(`/groups/${groupId}/accounts/${account.id}?no-redirect=true`);
                    }
                })
                .catch((err) => {
                    setSubmitting(false);
                    toast.error(`error while saving account: ${err.toString()}`);
                });
        },
        enableReinitialize: true,
    });

    const onUpdate = React.useCallback(() => {
        if (account) {
            dispatch(wipAccountUpdated({ ...account, ...formik.values }));
        }
    }, [dispatch, account, formik]);

    const abortEdit = () => {
        if (!account.isWip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(discardAccountChange({ groupId, accountId, api }))
            .unwrap()
            .then(({ deletedAccount }) => {
                setShowProgress(false);
                if (deletedAccount) {
                    navigate(`/groups/${groupId}/${account.type === "clearing" ? "events" : "accounts"}`);
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while cancelling edit: ${err.toString()}`);
            });
    };

    return (
        <>
            <Grid container justifyContent="space-between">
                <Grid item sx={{ display: "flex", alignItems: "center" }}>
                    <IconButton
                        sx={{ display: { xs: "none", md: "inline-flex" } }}
                        component={RouterLink}
                        to={account.type === "clearing" ? `/groups/${groupId}/events` : `/groups/${groupId}/accounts`}
                    >
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={accountTypeLabel} />
                </Grid>
                <Grid item>
                    {permissions.canWrite && (
                        <>
                            {account.isWip ? (
                                <>
                                    <Button color="primary" onClick={() => formik.handleSubmit()}>
                                        Save
                                    </Button>
                                    <Button color="error" onClick={abortEdit}>
                                        Cancel
                                    </Button>
                                </>
                            ) : (
                                <IconButton color="primary" onClick={edit}>
                                    <Edit />
                                </IconButton>
                            )}
                            <IconButton color="error" onClick={openDeleteDialog}>
                                <Delete />
                            </IconButton>
                        </>
                    )}
                </Grid>
            </Grid>
            <Divider sx={{ marginBottom: 1, marginTop: 1 }} />
            {(showProgress || formik.isSubmitting) && <LinearProgress />}
            <Grid container>
                <Grid item xs={12}>
                    <DisabledTextField
                        label="Name"
                        variant="standard"
                        margin="dense"
                        fullWidth
                        name="name"
                        autoFocus={true}
                        error={formik.touched.name && !!formik.errors.name}
                        helperText={formik.errors.name}
                        onChange={formik.handleChange}
                        onKeyUp={(key) => key.key === "Enter" && onUpdate()}
                        onBlur={onUpdate}
                        value={formik.values.name}
                        disabled={!account.isWip}
                    />
                    <DisabledTextField
                        label="Description"
                        variant="standard"
                        margin="dense"
                        fullWidth
                        name="description"
                        error={formik.touched.description && !!formik.errors.description}
                        helperText={formik.errors.description}
                        onChange={formik.handleChange}
                        onKeyUp={(key) => key.key === "Enter" && onUpdate()}
                        onBlur={onUpdate}
                        value={formik.values.description}
                        disabled={!account.isWip}
                    />
                    {account.type === "personal" && null}
                    {account.type === "clearing" && (
                        <>
                            <TagSelector
                                margin="dense"
                                fullWidth
                                label="Tags"
                                groupId={groupId}
                                value={formik.values.tags || []}
                                editable={account.isWip}
                                onChange={(newValue) => dispatch(wipAccountUpdated({ ...account, tags: newValue }))}
                            />
                            <DateInput
                                value={formik.values.dateInfo || ""}
                                onChange={(value) => dispatch(wipAccountUpdated({ ...account, dateInfo: value }))}
                                error={formik.touched.dateInfo && !!formik.errors.dateInfo}
                                helperText={formik.errors.dateInfo}
                                disabled={!account.isWip}
                            />
                        </>
                    )}
                </Grid>
                {account.type === "clearing" && account.isWip ? (
                    <Grid item xs={12}>
                        <ClearingShares groupId={groupId} accountId={accountId} />
                    </Grid>
                ) : null}
            </Grid>

            <DeleteAccountModal
                show={confirmDeleteDialogOpen}
                onClose={onCloseDeleteDialog}
                accountId={account.id}
                groupId={groupId}
                onAccountDeleted={onAccountDeleted}
            />
        </>
    );
};
