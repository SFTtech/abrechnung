import { AccountSelect } from "@/components/AccountSelect";
import { DateInput, NumericInput } from "@abrechnung/components";
import { ShareSelect } from "@/components/ShareSelect";
import { TagSelector } from "@/components/TagSelector";
import { TextInput } from "@/components/TextInput";
import { useAppDispatch, useAppSelector } from "@/store";
import {
    selectTransactionBalanceEffect,
    selectTransactionHasFiles,
    selectTransactionHasPositions,
    wipTransactionUpdated,
} from "@abrechnung/redux";
import { Account, Transaction, TransactionShare, TransactionValidator } from "@abrechnung/types";
import { Grid, InputAdornment, TableCell } from "@mui/material";
import * as React from "react";
import { typeToFlattenedError, z } from "zod";
import { FileGallery } from "./FileGallery";
import { useTranslation } from "react-i18next";
import { useFormatCurrency } from "@/hooks";

interface Props {
    groupId: number;
    transaction: Transaction;
    validationErrors: typeToFlattenedError<z.infer<typeof TransactionValidator>>;
    showPositions?: boolean | undefined;
}

export const TransactionMetadata: React.FC<Props> = ({
    groupId,
    transaction,
    validationErrors,
    showPositions = false,
}) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const dispatch = useAppDispatch();
    const hasAttachments = useAppSelector((state) => selectTransactionHasFiles(state, groupId, transaction.id));
    const hasPositions = useAppSelector((state) => selectTransactionHasPositions(state, groupId, transaction.id));
    const balanceEffect = useAppSelector((state) => selectTransactionBalanceEffect(state, groupId, transaction.id));

    const renderShareInfo = React.useCallback(
        ({ account }: { account: Account }) =>
            showPositions || hasPositions ? (
                <>
                    <TableCell align="right">
                        {formatCurrency(balanceEffect[account.id]?.positions ?? 0, transaction.currency_symbol)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {formatCurrency(balanceEffect[account.id]?.commonDebitors ?? 0, transaction.currency_symbol)}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {formatCurrency(
                            (balanceEffect[account.id]?.commonDebitors ?? 0) +
                                (balanceEffect[account.id]?.positions ?? 0),
                            transaction.currency_symbol
                        )}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {formatCurrency(
                        (balanceEffect[account.id]?.commonDebitors ?? 0) + (balanceEffect[account.id]?.positions ?? 0),
                        transaction.currency_symbol
                    )}
                </TableCell>
            ),
        [showPositions, hasPositions, transaction, balanceEffect, formatCurrency]
    );

    const shouldDisplayAccount = React.useCallback(
        (accountId: number) =>
            balanceEffect[accountId] !== undefined &&
            (balanceEffect[accountId].commonDebitors !== 0 || balanceEffect[accountId].positions !== 0),
        [balanceEffect]
    );

    const pushChanges = React.useCallback(
        (
            newValue: Partial<
                Pick<
                    Transaction,
                    "name" | "description" | "billed_at" | "value" | "creditor_shares" | "debitor_shares" | "tags"
                >
            >
        ) => {
            if (!transaction.is_wip) {
                return;
            }
            dispatch(wipTransactionUpdated({ ...transaction, ...newValue }));
        },
        [dispatch, transaction]
    );

    const updatedebitor_shares = React.useCallback(
        (shares: TransactionShare) => pushChanges({ debitor_shares: shares }),
        [pushChanges]
    );

    return (
        <Grid container>
            <Grid item xs={transaction.is_wip || hasAttachments ? 6 : 12}>
                <TextInput
                    label={t("common.name")}
                    name="name"
                    variant="standard"
                    margin="dense"
                    autoFocus
                    fullWidth
                    error={!!validationErrors.fieldErrors.name}
                    helperText={validationErrors.fieldErrors.name}
                    onChange={(value) => pushChanges({ name: value })}
                    value={transaction.name}
                    disabled={!transaction.is_wip}
                />
                {!transaction.is_wip && transaction.description === "" ? null : (
                    <TextInput
                        label={t("common.description")}
                        name="description"
                        variant="standard"
                        margin="dense"
                        fullWidth
                        error={!!validationErrors.fieldErrors.description}
                        helperText={validationErrors.fieldErrors.description}
                        onChange={(value) => pushChanges({ description: value })}
                        value={transaction.description}
                        disabled={!transaction.is_wip}
                    />
                )}
                <NumericInput
                    label={t("common.value")}
                    name="value"
                    variant="standard"
                    margin="dense"
                    fullWidth
                    error={!!validationErrors.fieldErrors.value}
                    helperText={validationErrors.fieldErrors.value}
                    onChange={(value) => pushChanges({ value })}
                    value={transaction.value}
                    isCurrency={true}
                    disabled={!transaction.is_wip}
                    InputProps={{
                        endAdornment: <InputAdornment position="end">{transaction.currency_symbol}</InputAdornment>,
                    }}
                />
                <DateInput
                    value={transaction.billed_at || ""}
                    onChange={(value) => pushChanges({ billed_at: value })}
                    error={!!validationErrors.fieldErrors.billed_at}
                    helperText={validationErrors.fieldErrors.billed_at}
                    disabled={!transaction.is_wip}
                />
                {!transaction.is_wip && transaction.tags.length === 0 ? null : (
                    <TagSelector
                        margin="dense"
                        fullWidth
                        label={t("common.tag", "", { count: 2 })}
                        groupId={groupId}
                        value={transaction.tags || []}
                        editable={transaction.is_wip}
                        onChange={(newValue) => pushChanges({ tags: newValue })}
                    />
                )}

                <AccountSelect
                    margin="normal"
                    groupId={groupId}
                    label={
                        transaction.type === "transfer" ? t("transactions.transferredFrom") : t("transactions.paidBy")
                    }
                    value={
                        Object.keys(transaction.creditor_shares).length === 0
                            ? undefined
                            : Number(Object.keys(transaction.creditor_shares)[0])
                    }
                    onChange={(newValue) => pushChanges({ creditor_shares: { [newValue.id]: 1.0 } })}
                    noDisabledStyling={true}
                    disabled={!transaction.is_wip}
                    error={!!validationErrors.fieldErrors.creditor_shares}
                    helperText={validationErrors.fieldErrors.creditor_shares}
                />

                {/* {transaction.type === "transfer" && (
                    <AccountSelect
                        margin="normal"
                        groupId={groupId}
                        label={t("transactions.transferredTo")}
                        value={
                            Object.keys(transaction.debitor_shares).length === 0
                                ? undefined
                                : Number(Object.keys(transaction.debitor_shares)[0])
                        }
                        onChange={(newValue) => pushChanges({ debitor_shares: { [newValue.id]: 1.0 } })}
                        noDisabledStyling={true}
                        disabled={!transaction.is_wip}
                        error={!!validationErrors.fieldErrors.debitor_shares}
                        helperText={validationErrors.fieldErrors.debitor_shares}
                    />
                )} */}
            </Grid>

            {(transaction.is_wip || hasAttachments) && (
                <Grid item xs={6}>
                    <FileGallery groupId={groupId} transaction={transaction} />
                </Grid>
            )}
            {transaction.type === "purchase" && (
                <Grid item xs={12}>
                    <ShareSelect
                        groupId={groupId}
                        label={t("transactions.paidFor")}
                        value={transaction.debitor_shares}
                        error={!!validationErrors.fieldErrors.debitor_shares}
                        helperText={validationErrors.fieldErrors.debitor_shares}
                        onChange={updatedebitor_shares}
                        shouldDisplayAccount={shouldDisplayAccount}
                        additionalShareInfoHeader={
                            showPositions || hasPositions ? (
                                <>
                                    <TableCell width="100px" align="right">
                                        {t("transactions.positions.positions")}
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        +
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        {t("transactions.positions.sharedPlusRest")}
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        =
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        {t("common.total")}
                                    </TableCell>
                                </>
                            ) : (
                                <TableCell width="100px" align="right">
                                    {t("common.shared")}
                                </TableCell>
                            )
                        }
                        renderAdditionalShareInfo={renderShareInfo}
                        editable={transaction.is_wip}
                    />
                </Grid>
            )}
        </Grid>
    );
};
