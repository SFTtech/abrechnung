import { AccountSelect } from "@/components/AccountSelect";
import { NumericInput } from "@/components/NumericInput";
import { TextInput } from "@/components/TextInput";
import { MobilePaper } from "@/components/style/mobile";
import { useFormatCurrency } from "@/hooks";
import { RootState, selectAccountSlice, selectTransactionSlice, useAppDispatch, useAppSelector } from "@/store";
import {
    positionDeleted,
    selectGroupAccounts,
    selectTransactionBalanceEffect,
    selectTransactionById,
    selectWipTransactionPositions,
    wipPositionAdded,
    wipPositionUpdated,
} from "@abrechnung/redux";
import { Account, PositionValidator, TransactionPosition } from "@abrechnung/types";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import {
    Checkbox,
    FormControlLabel,
    FormHelperText,
    Grid,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useTheme,
} from "@mui/material";
import memoize from "proxy-memoize";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { typeToFlattenedError, z } from "zod";

interface PositionTableRowProps {
    position: TransactionPosition;
    updatePosition: (
        position: TransactionPosition,
        newName: string,
        newPrice: number,
        newcommunist_shares: number
    ) => void;
    transactionAccounts: number[];
    showAdvanced: boolean;
    copyPosition: (position: TransactionPosition) => void;
    updatePositionUsage: (position: TransactionPosition, accountID: number, usages: number) => void;
    showAccountSelect: boolean;
    showAddAccount: boolean;
    deletePosition: (position: TransactionPosition) => void;
    validationError?: PositionValidationError;
}

const PositionTableRow: React.FC<PositionTableRowProps> = ({
    position,
    updatePosition,
    transactionAccounts,
    showAdvanced,
    copyPosition,
    updatePositionUsage,
    showAccountSelect,
    showAddAccount,
    deletePosition,
    validationError,
}) => {
    const theme = useTheme();

    const error = validationError !== undefined;

    return (
        <TableRow
            hover
            sx={{
                borderColor: error ? theme.palette.error.main : undefined,
                borderWidth: error ? 2 : undefined,
                borderStyle: error ? "solid" : undefined,
            }}
        >
            <TableCell>
                {validationError && validationError.formErrors && (
                    <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                        {validationError.formErrors}
                    </FormHelperText>
                )}
                {validationError && validationError.fieldErrors.communist_shares && (
                    <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                        {validationError.fieldErrors.communist_shares}
                    </FormHelperText>
                )}
                {validationError && validationError.fieldErrors.usages && (
                    <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                        {validationError.fieldErrors.usages}
                    </FormHelperText>
                )}
                <TextInput
                    value={position.name}
                    error={validationError && !!validationError.fieldErrors.name}
                    helperText={validationError && validationError.fieldErrors.name}
                    onChange={(value) => updatePosition(position, value, position.price, position.communist_shares)}
                />
            </TableCell>
            <TableCell align="right">
                <NumericInput
                    value={position.price}
                    isCurrency={true}
                    style={{ width: 70 }}
                    error={validationError && !!validationError.fieldErrors.price}
                    helperText={validationError && validationError.fieldErrors.price}
                    onChange={(value) => updatePosition(position, position.name, value, position.communist_shares)}
                />
            </TableCell>
            {transactionAccounts.map((accountID) => (
                <TableCell align="right" key={accountID}>
                    {showAdvanced ? (
                        <NumericInput
                            sx={{ maxWidth: 50 }}
                            value={position.usages[accountID] !== undefined ? position.usages[String(accountID)] : 0}
                            error={validationError && !!validationError.fieldErrors.usages}
                            onChange={(value) => updatePositionUsage(position, accountID, value)}
                            inputProps={{ tabIndex: -1 }}
                        />
                    ) : (
                        <Checkbox
                            name={`${accountID}-checked`}
                            checked={position.usages[accountID] !== undefined}
                            onChange={(event) => updatePositionUsage(position, accountID, event.target.checked ? 1 : 0)}
                            inputProps={{ tabIndex: -1 }}
                        />
                    )}
                </TableCell>
            ))}
            {showAccountSelect && <TableCell></TableCell>}
            {showAddAccount && <TableCell></TableCell>}
            <TableCell align="right">
                {showAdvanced ? (
                    <NumericInput
                        value={position.communist_shares}
                        sx={{ maxWidth: 50 }}
                        onChange={(value) => updatePosition(position, position.name, position.price, value)}
                        error={validationError && !!validationError.fieldErrors.communist_shares}
                        inputProps={{ tabIndex: -1 }}
                    />
                ) : (
                    <Checkbox
                        name="communist-checked"
                        checked={position.communist_shares !== 0}
                        onChange={(event) =>
                            updatePosition(position, position.name, position.price, event.target.checked ? 1 : 0)
                        }
                        inputProps={{ tabIndex: -1 }}
                    />
                )}
            </TableCell>
            <TableCell sx={{ minWidth: "120px" }}>
                <IconButton onClick={() => copyPosition(position)} tabIndex={-1}>
                    <ContentCopy />
                </IconButton>
                <IconButton onClick={() => deletePosition(position)} tabIndex={-1}>
                    <Delete />
                </IconButton>
            </TableCell>
        </TableRow>
    );
};

type PositionValidationError = typeToFlattenedError<z.infer<typeof PositionValidator>>;
export type ValidationErrors = {
    [positionId: number]: PositionValidationError;
};

interface TransactionPositionsProps {
    groupId: number;
    transactionId: number;
    validationErrors?: ValidationErrors;
}

const selectPositions = memoize(
    ({ state, groupId, transactionId }: { state: RootState; groupId: number; transactionId: number }) => {
        const positions = selectWipTransactionPositions({
            state: selectTransactionSlice(state),
            groupId,
            transactionId,
        });
        const positionsHaveComplexShares = positions.reduce(
            (hasComplex, position) =>
                hasComplex ||
                (position.communist_shares !== 0 && position.communist_shares !== 1) ||
                Object.values(position.usages).reduce((nonOne, usage) => nonOne || (usage !== 0 && usage !== 1), false),
            false
        );
        return { positions, positionsHaveComplexShares };
    }
);

export const TransactionPositions: React.FC<TransactionPositionsProps> = ({
    groupId,
    transactionId,
    validationErrors,
}) => {
    const { t } = useTranslation();
    const formatCurrency = useFormatCurrency();
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const { positions, positionsHaveComplexShares } = useAppSelector((state) =>
        selectPositions({ state, groupId, transactionId })
    );
    const transactionBalanceEffect = useAppSelector((state) =>
        selectTransactionBalanceEffect({ state: selectTransactionSlice(state), groupId, transactionId })
    );

    const dispatch = useAppDispatch();
    const [showAdvanced, setShowAdvanced] = useState(false);

    // find all accounts that take part in the transaction, either via debitor shares or purchase items
    // TODO: should we add creditor accounts as well?
    const positionAccounts: number[] = Array.from(
        new Set<number>(
            positions
                .map((item) => Object.keys(item.usages))
                .flat()
                .map((id) => parseInt(id))
        )
    );

    const [additionalPurchaseItemAccounts, setAdditionalPurchaseItemAccounts] = useState([]);
    const transactionAccounts: number[] = Array.from(
        new Set<number>(
            Object.keys(transaction.debitor_shares)
                .map((id) => parseInt(id))
                .concat(positionAccounts)
                .concat(additionalPurchaseItemAccounts)
        )
    );

    const showAddAccount = transactionAccounts.length < accounts.length;

    const [showAccountSelect, setShowAccountSelect] = useState(false);

    const totalPositionValue = positions.reduce((acc, curr) => acc + curr.price, 0);
    const sharedTransactionValue = transaction.value - totalPositionValue;

    const purchaseItemSumForAccount = (accountID) => {
        return transactionBalanceEffect[accountID] !== undefined ? transactionBalanceEffect[accountID].positions : 0;
    };

    const updatePosition = (position: TransactionPosition, name: string, price: number, communist_shares: number) => {
        dispatch(
            wipPositionUpdated({ groupId, transactionId, position: { ...position, name, price, communist_shares } })
        );
    };

    const updatePositionUsage = (position: TransactionPosition, accountID: number, shares: number) => {
        const usages = { ...position.usages };
        if (shares === 0) {
            delete usages[accountID];
        } else {
            usages[accountID] = shares;
        }
        dispatch(wipPositionUpdated({ groupId, transactionId, position: { ...position, usages } }));
    };

    const deletePosition = (position: TransactionPosition) => {
        dispatch(positionDeleted({ groupId, transactionId, positionId: position.id }));
    };

    const copyPosition = (position: TransactionPosition) => {
        dispatch(wipPositionAdded({ groupId, transactionId, position }));
    };

    const addPurchaseItemAccount = (account: Account) => {
        setShowAccountSelect(false);
        setAdditionalPurchaseItemAccounts((currAdditionalAccounts) =>
            Array.from(new Set<number>([...currAdditionalAccounts, account.id]))
        );
    };

    return (
        <MobilePaper sx={{ marginTop: 2 }}>
            <Grid container direction="row" justifyContent="space-between">
                <Typography>{t("transactions.positions.positions")}</Typography>
                {transaction.is_wip && (
                    <FormControlLabel
                        control={<Checkbox name="show-advanced" />}
                        checked={showAdvanced}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setShowAdvanced(event.target.checked)}
                        label={t("common.advanced")}
                    />
                )}
            </Grid>
            <TableContainer>
                <Table sx={{ minWidth: 650 }} stickyHeader aria-label="purchase items" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t("common.name")}</TableCell>
                            <TableCell align="right">{t("common.price")}</TableCell>
                            {(transaction.is_wip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" sx={{ minWidth: 80 }} key={accountID}>
                                    {accounts.find((account) => account.id === accountID).name}
                                </TableCell>
                            ))}
                            {transaction.is_wip && (
                                <>
                                    {showAccountSelect && (
                                        <TableCell align="right">
                                            <AccountSelect
                                                groupId={groupId}
                                                exclude={transactionAccounts}
                                                onChange={addPurchaseItemAccount}
                                            />
                                        </TableCell>
                                    )}
                                    {showAddAccount && (
                                        <TableCell align="right">
                                            <IconButton onClick={() => setShowAccountSelect(true)}>
                                                <Add />
                                            </IconButton>
                                        </TableCell>
                                    )}
                                </>
                            )}
                            <TableCell align="right">{t("common.shared")}</TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transaction.is_wip
                            ? positions.map((position, idx) => (
                                  <PositionTableRow
                                      key={position.id}
                                      position={position}
                                      deletePosition={deletePosition}
                                      transactionAccounts={transactionAccounts}
                                      copyPosition={copyPosition}
                                      updatePosition={updatePosition}
                                      updatePositionUsage={updatePositionUsage}
                                      showAdvanced={showAdvanced}
                                      showAccountSelect={showAccountSelect}
                                      showAddAccount={showAddAccount}
                                      validationError={validationErrors[position.id]}
                                  />
                              ))
                            : positions.map((position) => (
                                  <TableRow hover key={position.id}>
                                      <TableCell>{position.name}</TableCell>
                                      <TableCell align="right" style={{ minWidth: 80 }}>
                                          {formatCurrency(position.price, transaction.currency_symbol)}
                                      </TableCell>
                                      {positionAccounts.map((accountID) => (
                                          <TableCell align="right" key={accountID}>
                                              {positionsHaveComplexShares ? (
                                                  position.usages[accountID] !== undefined ? (
                                                      position.usages[String(accountID)]
                                                  ) : (
                                                      0
                                                  )
                                              ) : (
                                                  <Checkbox
                                                      checked={(position.usages[accountID] ?? 0) !== 0}
                                                      disabled={true}
                                                  />
                                              )}
                                          </TableCell>
                                      ))}
                                      <TableCell align="right">
                                          {positionsHaveComplexShares ? (
                                              position.communist_shares
                                          ) : (
                                              <Checkbox checked={position.communist_shares !== 0} disabled={true} />
                                          )}
                                      </TableCell>
                                  </TableRow>
                              ))}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>{t("common.totalWithColon")}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {formatCurrency(totalPositionValue, transaction.currency_symbol)}
                            </TableCell>
                            {(transaction.is_wip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    {formatCurrency(purchaseItemSumForAccount(accountID), transaction.currency_symbol)}
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                {formatCurrency(
                                    positions.reduce((acc, curr) => acc + curr.price, 0) -
                                        Object.values(transactionBalanceEffect).reduce(
                                            (acc, curr) => acc + curr.positions,
                                            0
                                        ),
                                    transaction.currency_symbol
                                )}
                            </TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>
                                    {t("transactions.positions.remaining")}
                                </Typography>
                            </TableCell>
                            <TableCell align="right">
                                {formatCurrency(sharedTransactionValue, transaction.currency_symbol)}
                            </TableCell>
                            {(transaction.is_wip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}></TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}></TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </MobilePaper>
    );
};
