import {
    selectTransactionBalanceEffect,
    selectTransactionHasAttachments,
    selectTransactionHasPositions,
    wipTransactionUpdated,
} from "@abrechnung/redux";
import { Transaction, TransactionShare, TransactionValidator } from "@abrechnung/types";
import { Grid, TableCell } from "@mui/material";
import * as React from "react";
import { typeToFlattenedError, z } from "zod";
import { AccountSelect } from "../../../components/AccountSelect";
import { DateInput } from "../../../components/DateInput";
import { NumericInput } from "../../../components/NumericInput";
import { ShareSelect } from "../../../components/ShareSelect";
import { TagSelector } from "../../../components/TagSelector";
import { TextInput } from "../../../components/TextInput";
import { selectTransactionSlice, useAppDispatch, useAppSelector } from "../../../store";
import { FileGallery } from "./FileGallery";

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
    const dispatch = useAppDispatch();
    const transactionId = transaction.id;
    const hasAttachments = useAppSelector((state) =>
        selectTransactionHasAttachments({
            state: selectTransactionSlice(state),
            groupId,
            transactionId: transaction.id,
        })
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
                        {(balanceEffect[account.id]?.positions ?? 0).toFixed(2)} {transaction.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                        {(balanceEffect[account.id]?.commonDebitors ?? 0).toFixed(2)} {transaction.currencySymbol}
                    </TableCell>
                    <TableCell></TableCell>
                    <TableCell width="100px" align="right">
                        {(
                            (balanceEffect[account.id]?.commonDebitors ?? 0) +
                            (balanceEffect[account.id]?.positions ?? 0)
                        ).toFixed(2)}{" "}
                        {transaction.currencySymbol}
                    </TableCell>
                </>
            ) : (
                <TableCell width="100px" align="right">
                    {(
                        (balanceEffect[account.id]?.commonDebitors ?? 0) + (balanceEffect[account.id]?.positions ?? 0)
                    ).toFixed(2)}{" "}
                    {transaction.currencySymbol}
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
                    "name" | "description" | "billedAt" | "value" | "creditorShares" | "debitorShares" | "tags"
                >
            >
        ) => {
            dispatch(wipTransactionUpdated({ ...transaction, ...newValue }));
        },
        [dispatch, transaction]
    );

    const updateDebitorShares = React.useCallback(
        (shares: TransactionShare) => pushChanges({ debitorShares: shares }),
        [pushChanges]
    );

    return (
        <Grid container>
            <Grid item xs={transaction.isWip || hasAttachments ? 6 : 12}>
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
                    disabled={!transaction.isWip}
                />
                {!transaction.isWip && transaction.description === "" ? null : (
                    <TextInput
                        label="Description"
                        name="description"
                        variant="standard"
                        margin="dense"
                        autoFocus
                        fullWidth
                        error={!!validationErrors.fieldErrors.description}
                        helperText={validationErrors.fieldErrors.description}
                        onChange={(value) => pushChanges({ description: value })}
                        value={transaction.description}
                        disabled={!transaction.isWip}
                    />
                )}
                <NumericInput
                    label="Value"
                    name="value"
                    variant="standard"
                    margin="dense"
                    autoFocus
                    fullWidth
                    error={!!validationErrors.fieldErrors.value}
                    helperText={validationErrors.fieldErrors.value}
                    onChange={(value) => pushChanges({ value })}
                    value={transaction.value}
                    disabled={!transaction.isWip}
                />
                <DateInput
                    value={transaction.billedAt || ""}
                    onChange={(value) => pushChanges({ billedAt: value })}
                    error={!!validationErrors.fieldErrors.billedAt}
                    helperText={validationErrors.fieldErrors.billedAt}
                    disabled={!transaction.isWip}
                />
                {!transaction.isWip && transaction.tags.length === 0 ? null : (
                    <TagSelector
                        margin="dense"
                        fullWidth
                        label="Tags"
                        groupId={groupId}
                        value={transaction.tags || []}
                        editable={transaction.isWip}
                        onChange={(newValue) => pushChanges({ tags: newValue })}
                    />
                )}

                <AccountSelect
                    margin="normal"
                    groupId={groupId}
                    label={transaction.type === "transfer" ? "From" : "Paid by"}
                    value={
                        Object.keys(transaction.creditorShares).length === 0
                            ? null
                            : Number(Object.keys(transaction.creditorShares)[0])
                    }
                    onChange={(newValue) => pushChanges({ creditorShares: { [newValue.id]: 1.0 } })}
                    noDisabledStyling={true}
                    disabled={!transaction.isWip}
                    error={!!validationErrors.fieldErrors.creditorShares}
                    helperText={validationErrors.fieldErrors.creditorShares}
                />

                {transaction.type === "transfer" && (
                    <AccountSelect
                        margin="normal"
                        groupId={groupId}
                        label={"To"}
                        value={
                            Object.keys(transaction.debitorShares).length === 0
                                ? null
                                : Number(Object.keys(transaction.debitorShares)[0])
                        }
                        onChange={(newValue) => pushChanges({ debitorShares: { [newValue.id]: 1.0 } })}
                        noDisabledStyling={true}
                        disabled={!transaction.isWip}
                        error={!!validationErrors.fieldErrors.debitorShares}
                        helperText={validationErrors.fieldErrors.debitorShares}
                    />
                )}
            </Grid>

            {(transaction.isWip || hasAttachments) && (
                <Grid item xs={6}>
                    <FileGallery groupId={groupId} transactionId={transactionId} />
                </Grid>
            )}
            {transaction.type === "purchase" && (
                <Grid item xs={12}>
                    <ShareSelect
                        groupId={groupId}
                        label="For whom"
                        value={transaction.debitorShares}
                        error={!!validationErrors.fieldErrors.debitorShares}
                        helperText={validationErrors.fieldErrors.debitorShares}
                        onChange={updateDebitorShares}
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
                        editable={transaction.isWip}
                    />
                </Grid>
            )}
        </Grid>
    );
};
