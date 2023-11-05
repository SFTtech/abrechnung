import { AccountSelect } from "@/components/AccountSelect";
import { DateInput } from "@/components/DateInput";
import { NumericInput } from "@/components/NumericInput";
import { ShareSelect } from "@/components/ShareSelect";
import { TagSelector } from "@/components/TagSelector";
import { TextInput } from "@/components/TextInput";
import { selectTransactionSlice, useAppDispatch, useAppSelector } from "@/store";
import {
    selectTransactionBalanceEffect,
    selectTransactionById,
    selectTransactionHasFiles,
    selectTransactionHasPositions,
    wipTransactionUpdated,
} from "@abrechnung/redux";
import { Transaction, TransactionShare, TransactionValidator } from "@abrechnung/types";
import { Grid, InputAdornment, TableCell } from "@mui/material";
import * as React from "react";
import { typeToFlattenedError, z } from "zod";
import { FileGallery } from "./FileGallery";

interface Props {
    groupId: number;
    transactionId: number;
    validationErrors: typeToFlattenedError<z.infer<typeof TransactionValidator>>;
    showPositions?: boolean | undefined;
}

export const TransactionMetadata: React.FC<Props> = ({
    groupId,
    transactionId,
    validationErrors,
    showPositions = false,
}) => {
    const dispatch = useAppDispatch();
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const hasAttachments = useAppSelector((state) =>
        selectTransactionHasFiles({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const hasPositions = useAppSelector((state) =>
        selectTransactionHasPositions({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const balanceEffect = useAppSelector((state) =>
        selectTransactionBalanceEffect({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const renderShareInfo = React.useCallback(
        ({ account }) =>
            showPositions || hasPositions ? (
                <>
                    <TableCell align="right">
                        {(balanceEffect[account.id]?.positions ?? 0).toFixed(2)} {transaction.currency_symbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {(balanceEffect[account.id]?.commonDebitors ?? 0).toFixed(2)} {transaction.currency_symbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {(
                            (balanceEffect[account.id]?.commonDebitors ?? 0) +
                            (balanceEffect[account.id]?.positions ?? 0)
                        ).toFixed(2)}{" "}
                        {transaction.currency_symbol}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {(
                        (balanceEffect[account.id]?.commonDebitors ?? 0) + (balanceEffect[account.id]?.positions ?? 0)
                    ).toFixed(2)}{" "}
                    {transaction.currency_symbol}
                </TableCell>
            ),
        [showPositions, hasPositions, transaction, balanceEffect]
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
                    label="Name"
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
                        label="Description"
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
                    label="Value"
                    name="value"
                    variant="standard"
                    margin="dense"
                    fullWidth
                    error={!!validationErrors.fieldErrors.value}
                    helperText={validationErrors.fieldErrors.value}
                    onChange={(value) => pushChanges({ value })}
                    value={transaction.value}
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
                        label="Tags"
                        groupId={groupId}
                        value={transaction.tags || []}
                        editable={transaction.is_wip}
                        onChange={(newValue) => pushChanges({ tags: newValue })}
                    />
                )}

                <AccountSelect
                    margin="normal"
                    groupId={groupId}
                    label={transaction.type === "transfer" ? "From" : "Paid by"}
                    value={
                        Object.keys(transaction.creditor_shares).length === 0
                            ? null
                            : Number(Object.keys(transaction.creditor_shares)[0])
                    }
                    onChange={(newValue) => pushChanges({ creditor_shares: { [newValue.id]: 1.0 } })}
                    noDisabledStyling={true}
                    disabled={!transaction.is_wip}
                    error={!!validationErrors.fieldErrors.creditor_shares}
                    helperText={validationErrors.fieldErrors.creditor_shares}
                />

                {transaction.type === "transfer" && (
                    <AccountSelect
                        margin="normal"
                        groupId={groupId}
                        label={"To"}
                        value={
                            Object.keys(transaction.debitor_shares).length === 0
                                ? null
                                : Number(Object.keys(transaction.debitor_shares)[0])
                        }
                        onChange={(newValue) => pushChanges({ debitor_shares: { [newValue.id]: 1.0 } })}
                        noDisabledStyling={true}
                        disabled={!transaction.is_wip}
                        error={!!validationErrors.fieldErrors.debitor_shares}
                        helperText={validationErrors.fieldErrors.debitor_shares}
                    />
                )}
            </Grid>

            {(transaction.is_wip || hasAttachments) && (
                <Grid item xs={6}>
                    <FileGallery groupId={groupId} transactionId={transactionId} />
                </Grid>
            )}
            {transaction.type === "purchase" && (
                <Grid item xs={12}>
                    <ShareSelect
                        groupId={groupId}
                        label="For whom"
                        value={transaction.debitor_shares}
                        error={!!validationErrors.fieldErrors.debitor_shares}
                        helperText={validationErrors.fieldErrors.debitor_shares}
                        onChange={updatedebitor_shares}
                        shouldDisplayAccount={shouldDisplayAccount}
                        additionalShareInfoHeader={
                            showPositions || hasPositions ? (
                                <>
                                    <TableCell width="100px" align="right">
                                        Positions
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        +
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        Shared + Rest
                                    </TableCell>
                                    <TableCell width="3px" align="center">
                                        =
                                    </TableCell>
                                    <TableCell width="100px" align="right">
                                        Total
                                    </TableCell>
                                </>
                            ) : (
                                <TableCell width="100px" align="right">
                                    Shared
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
