import {
    accountEditStarted,
    discardAccountChange,
    saveAccount,
    selectAccountBalances,
    selectAccountById,
    selectCurrentUserPermissions,
    selectGroupCurrencySymbol,
    wipAccountUpdated,
} from "@abrechnung/redux";
import { Account, AccountValidator } from "@abrechnung/types";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import { Button, Chip, Divider, Grid, IconButton, LinearProgress, TableCell } from "@mui/material";
import React from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { typeToFlattenedError, z } from "zod";
import { DeleteAccountModal } from "../../../components/accounts/DeleteAccountModal";
import { DateInput } from "../../../components/DateInput";
import { ShareSelect } from "../../../components/ShareSelect";
import { TagSelector } from "../../../components/TagSelector";
import { TextInput } from "../../../components/TextInput";
import { api } from "../../../core/api";
import { selectAccountSlice, selectGroupSlice, useAppDispatch, useAppSelector } from "../../../store";
import { getAccountLink, getAccountListLink } from "../../../utils";

interface Props {
    groupId: number;
    accountId: number;
}

const emptyErrors = { fieldErrors: {}, formErrors: [] };

export const AccountInfo: React.FC<Props> = ({ groupId, accountId }) => {
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const permissions = useAppSelector((state) => selectCurrentUserPermissions({ state: state, groupId }));
    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );
    const currencySymbol = useAppSelector((state) =>
        selectGroupCurrencySymbol({ state: selectGroupSlice(state), groupId })
    );
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);
    const [validationErrors, setValidationErrors] =
        React.useState<typeToFlattenedError<z.infer<typeof AccountValidator>>>(emptyErrors);

    const openDeleteDialog = () => setConfirmDeleteDialogOpen(true);
    const onCloseDeleteDialog = () => setConfirmDeleteDialogOpen(false);

    const onAccountDeleted = () => {
        navigate(getAccountListLink(groupId, account.type));
    };

    const accountTypeLabel = account.type === "clearing" ? "event" : "account";

    const navigateBack = () => {
        navigate(-1);
    };

    const edit = () => {
        if (!account.isWip) {
            dispatch(accountEditStarted({ groupId, accountId }));
        }
    };

    const save = React.useCallback(() => {
        if (!account || !account.isWip) {
            toast.error("Cannot save as there are not changes made");
            return;
        }

        const validated = AccountValidator.safeParse(account);
        if (!validated.success) {
            setValidationErrors((validated as any).error.formErrors);
            return;
        }
        setValidationErrors(emptyErrors);

        setShowProgress(true);
        dispatch(saveAccount({ groupId: groupId, accountId: account.id, api }))
            .unwrap()
            .then(({ oldAccountId, account }) => {
                setShowProgress(false);
                if (oldAccountId !== account.id) {
                    navigate(getAccountLink(groupId, "clearing", account.id) + "?no-redirect=true", { replace: true });
                }
            })
            .catch((err) => {
                setShowProgress(false);
                toast.error(`error while saving account: ${err.toString()}`);
            });
    }, [account, setValidationErrors, setShowProgress, navigate, groupId, dispatch]);

    const pushChanges = (newValue: Partial<Account>) => {
        dispatch(wipAccountUpdated({ ...account, ...(newValue as any) }));
    };

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
                    <IconButton sx={{ display: { xs: "none", md: "inline-flex" } }} onClick={navigateBack}>
                        <ChevronLeft />
                    </IconButton>
                    <Chip color="primary" label={accountTypeLabel} />
                </Grid>
                <Grid item>
                    {permissions.canWrite && (
                        <>
                            {account.isWip ? (
                                <>
                                    <Button color="primary" onClick={save}>
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
            {showProgress && <LinearProgress />}
            <Grid container>
                <Grid item xs={12}>
                    <TextInput
                        label="Name"
                        variant="standard"
                        margin="dense"
                        fullWidth
                        name="name"
                        autoFocus={true}
                        error={!!validationErrors.fieldErrors.name}
                        helperText={validationErrors.fieldErrors.name}
                        onChange={(value) => pushChanges({ name: value })}
                        value={account.name}
                        disabled={!account.isWip}
                    />
                    {!account.isWip && account.description === "" ? null : (
                        <TextInput
                            label="Description"
                            variant="standard"
                            margin="dense"
                            fullWidth
                            name="description"
                            error={!!validationErrors.fieldErrors.description}
                            helperText={validationErrors.fieldErrors.description}
                            onChange={(value) => pushChanges({ name: value })}
                            value={account.description}
                            disabled={!account.isWip}
                        />
                    )}
                    {account.type === "personal" && null}
                    {account.type === "clearing" && (
                        <>
                            {!account.isWip && (account.tags ?? []).length === 0 ? null : (
                                <TagSelector
                                    margin="dense"
                                    fullWidth
                                    label="Tags"
                                    groupId={groupId}
                                    value={account.tags || []}
                                    editable={account.isWip}
                                    onChange={(newValue) => pushChanges({ tags: newValue })}
                                />
                            )}
                            <DateInput
                                value={account.dateInfo || ""}
                                onChange={(value) => pushChanges({ dateInfo: value })}
                                error={!!validationErrors.fieldErrors.dateInfo}
                                helperText={validationErrors.fieldErrors.dateInfo}
                                disabled={!account.isWip}
                            />
                        </>
                    )}
                </Grid>
                {account.type === "clearing" && account.isWip ? (
                    <Grid item xs={12}>
                        <ShareSelect
                            groupId={groupId}
                            label="Participated"
                            value={account.clearingShares}
                            additionalShareInfoHeader={
                                <TableCell width="100px" align="right">
                                    Shared
                                </TableCell>
                            }
                            error={!!validationErrors.fieldErrors.clearingShares}
                            helperText={validationErrors.fieldErrors.clearingShares}
                            excludeAccounts={[account.id]}
                            renderAdditionalShareInfo={({ account: participatingAccount }) => (
                                <TableCell width="100px" align="right">
                                    {(balances[account.id]?.clearingResolution[participatingAccount.id] ?? 0).toFixed(
                                        2
                                    )}{" "}
                                    {currencySymbol}
                                </TableCell>
                            )}
                            onChange={(value) => pushChanges({ clearingShares: value })}
                            editable={account.isWip}
                        />
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
