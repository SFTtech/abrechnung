import { DateInput } from "@abrechnung/components";
import { ShareSelect } from "@/components/ShareSelect";
import { TagSelector } from "@/components/TagSelector";
import { TextInput } from "@/components/TextInput";
import { DeleteAccountModal } from "@/components/accounts/DeleteAccountModal";
import { api } from "@/core/api";
import { useFormatCurrency } from "@/hooks";
import { useAppDispatch, useAppSelector } from "@/store";
import { getAccountLink, getAccountListLink } from "@/utils";
import {
    accountEditStarted,
    discardAccountChange,
    saveAccount,
    selectAccountBalances,
    useGroupCurrencySymbol,
    useIsGroupWritable,
    wipAccountUpdated,
} from "@abrechnung/redux";
import { Account, AccountValidator } from "@abrechnung/types";
import { ChevronLeft, Delete, Edit } from "@mui/icons-material";
import { Button, Chip, Divider, Grid, IconButton, LinearProgress, TableCell } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate } from "react-router";
import { toast } from "react-toastify";
import { typeToFlattenedError, z } from "zod";

interface Props {
    groupId: number;
    account: Account;
}

const emptyErrors = { fieldErrors: {}, formErrors: [] };

export const AccountInfo: React.FC<Props> = ({ groupId, account }) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isGroupWritable = useIsGroupWritable(groupId);
    const currencySymbol = useGroupCurrencySymbol(groupId);
    const balances = useAppSelector((state) => selectAccountBalances(state, groupId));

    const [confirmDeleteDialogOpen, setConfirmDeleteDialogOpen] = React.useState(false);
    const [showProgress, setShowProgress] = React.useState(false);
    const [validationErrors, setValidationErrors] =
        React.useState<typeToFlattenedError<z.infer<typeof AccountValidator>>>(emptyErrors);

    const openDeleteDialog = () => setConfirmDeleteDialogOpen(true);
    const onCloseDeleteDialog = () => setConfirmDeleteDialogOpen(false);

    const onAccountDeleted = () => {
        navigate(getAccountListLink(groupId, account.type));
    };

    const accountTypeLabel = account.type === "clearing" ? t("accounts.event") : t("accounts.account");

    const navigateBack = () => {
        navigate(-1);
    };

    const edit = () => {
        if (!account.is_wip) {
            dispatch(accountEditStarted({ groupId, accountId: account.id }));
        }
    };

    const save = React.useCallback(() => {
        if (!account || !account.is_wip) {
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
                    navigate(getAccountLink(groupId, account.type, account.id) + "?no-redirect=true", {
                        replace: true,
                    });
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
        if (!account.is_wip) {
            toast.error("Cannot cancel editing as there are not changes made");
            return;
        }
        setShowProgress(true);
        dispatch(discardAccountChange({ groupId, accountId: account.id }));
        setShowProgress(false);
        navigate(`/groups/${groupId}/${account.type === "clearing" ? "events" : "accounts"}`);
    };

    if (!currencySymbol) {
        return <Navigate to="/404" />;
    }

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
                    {isGroupWritable && (
                        <>
                            {account.is_wip ? (
                                <>
                                    <Button color="primary" onClick={save}>
                                        {t("common.save")}
                                    </Button>
                                    <Button color="error" onClick={abortEdit}>
                                        {t("common.cancel")}
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
                        label={t("common.name")}
                        variant="standard"
                        margin="dense"
                        fullWidth
                        name="name"
                        autoFocus={true}
                        error={!!validationErrors.fieldErrors.name}
                        helperText={validationErrors.fieldErrors.name}
                        onChange={(value) => pushChanges({ name: value })}
                        value={account.name}
                        disabled={!account.is_wip}
                    />
                    {!account.is_wip && account.description === "" ? null : (
                        <TextInput
                            label={t("common.description")}
                            variant="standard"
                            margin="dense"
                            fullWidth
                            name="description"
                            error={!!validationErrors.fieldErrors.description}
                            helperText={validationErrors.fieldErrors.description}
                            onChange={(value) => pushChanges({ description: value })}
                            value={account.description}
                            disabled={!account.is_wip}
                        />
                    )}
                    {account.type === "personal" && null}
                    {account.type === "clearing" && (
                        <>
                            {!account.is_wip && (account.tags ?? []).length === 0 ? null : (
                                <TagSelector
                                    margin="dense"
                                    fullWidth
                                    label={t("common.tag", "", { count: 2 })}
                                    groupId={groupId}
                                    value={account.tags || []}
                                    editable={account.is_wip}
                                    onChange={(newValue) => pushChanges({ tags: newValue })}
                                />
                            )}
                            <DateInput
                                value={account.date_info || ""}
                                onChange={(value) => pushChanges({ date_info: value })}
                                error={!!validationErrors.fieldErrors.date_info}
                                helperText={validationErrors.fieldErrors.date_info}
                                disabled={!account.is_wip}
                            />
                        </>
                    )}
                </Grid>
                {account.type === "clearing" && account.is_wip ? (
                    <Grid item xs={12}>
                        <ShareSelect
                            groupId={groupId}
                            label={t("accounts.participated")}
                            value={account.clearing_shares}
                            additionalShareInfoHeader={
                                <TableCell width="100px" align="right">
                                    {t("common.shared")}
                                </TableCell>
                            }
                            error={!!validationErrors.fieldErrors.clearing_shares}
                            helperText={validationErrors.fieldErrors.clearing_shares}
                            excludeAccounts={[account.id]}
                            renderAdditionalShareInfo={({ account: participatingAccount }) => (
                                <TableCell width="100px" align="right">
                                    {formatCurrency(
                                        balances[account.id]?.clearingResolution[participatingAccount.id] ?? 0,
                                        currencySymbol
                                    )}
                                </TableCell>
                            )}
                            onChange={(value) => pushChanges({ clearing_shares: value })}
                            editable={account.is_wip}
                        />
                    </Grid>
                ) : null}
            </Grid>

            <DeleteAccountModal
                show={confirmDeleteDialogOpen}
                onClose={onCloseDeleteDialog}
                account={account}
                groupId={groupId}
                onAccountDeleted={onAccountDeleted}
            />
        </>
    );
};
