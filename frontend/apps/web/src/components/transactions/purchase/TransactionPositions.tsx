import React, { useEffect, useState } from "react";
import {
    Checkbox,
    FormControlLabel,
    Grid,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    TextFieldProps,
    Typography,
} from "@mui/material";
import { useRecoilState, useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../../state/accounts";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import AccountSelect from "../../style/AccountSelect";
import { LocalPositionChanges, pendingTransactionPositionChanges } from "../../../state/transactions";
import { MobilePaper } from "../../style/mobile";
import { Account, Group, Transaction, TransactionPosition, TransactionShare } from "@abrechnung/types";

type ShareInputProps = {
    value: number;
    onChange: (newValue: number) => void;
} & TextFieldProps;

const ShareInput: React.FC<ShareInputProps> = ({ value, onChange, ...props }) => {
    const [currValue, setValue] = useState<string>("0");
    const [error, setError] = useState(false);

    function validate(val) {
        return !(val === null || val === undefined || val === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0);
    }

    useEffect(() => {
        setValue(String(value));
        setError(!validate(value));
    }, [value]);

    const onSave = () => {
        if (!error) {
            onChange(parseFloat(currValue));
        }
    };

    const onValueChange = (event) => {
        const val = event.target.value;
        setValue(val);
        setError(!validate(value));
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            margin="dense"
            variant="standard"
            style={{ width: 40 }}
            onBlur={onSave}
            value={currValue}
            error={error}
            onChange={onValueChange}
            onKeyUp={onKeyUp}
            {...props}
        />
    );
};

type WrappedTextFieldProps = {
    value: string;
    onChange: (newValue: string) => void;
    initial?: string | null;
    errorMsg?: string | null;
    validate?: (value: string) => boolean;
} & TextFieldProps;

const WrappedTextField: React.FC<WrappedTextFieldProps> = ({
    value,
    onChange,
    initial = null,
    errorMsg = null,
    validate = null,
    ...props
}) => {
    const [currValue, setValue] = useState(initial);
    const [error, setError] = useState(false);

    useEffect(() => {
        if (value !== "") {
            // FIXME: when there is a rerender in between onBlur and local state settings the empty value prop overrides
            setValue(value);
            if (validate !== null) {
                setError(!validate(value));
            }
        }
    }, [value, validate, setValue, setError]);

    const onSave = () => {
        if (!error) {
            onChange(currValue);
        }
    };

    const onValueChange = (event) => {
        const val = event.target.value;
        setValue(val);
        if (validate !== null) {
            setError(!validate(val));
        }
    };

    const onKeyUp = (key) => {
        if (key.keyCode === 13) {
            onSave();
        }
    };

    return (
        <TextField
            margin="dense"
            variant="standard"
            onBlur={onSave}
            value={currValue}
            onChange={onValueChange}
            onKeyUp={onKeyUp}
            error={error}
            helperText={error && errorMsg ? errorMsg : null}
            {...props}
        />
    );
};

interface PositionTableRowProps {
    position: TransactionPositionWithLocalFlag;
    updatePosition: (
        position: TransactionPositionWithLocalFlag,
        newName: string,
        newPrice: number,
        newCommunistShares: number
    ) => void;
    transactionAccounts: number[];
    showAdvanced: boolean;
    copyPosition: (position: TransactionPositionWithLocalFlag) => void;
    updatePositionUsage: (position: TransactionPositionWithLocalFlag, accountID: number, usages: number) => void;
    showAccountSelect: boolean;
    showAddAccount: boolean;
    deletePosition: (position: TransactionPositionWithLocalFlag) => void;
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
}) => {
    const validateFloat = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)));
    };
    return (
        <>
            <TableCell key={`position-${position.id}-name`}>
                <WrappedTextField
                    key={`position-${position.id}-name`}
                    value={position.name}
                    id={`position-${position.id}-name`}
                    onChange={(value) => updatePosition(position, value, position.price, position.communistShares)}
                    validate={(value) => value !== "" && value != null}
                />
            </TableCell>
            <TableCell key={`position-${position.id}-communist`} align="right">
                <WrappedTextField
                    key={`position-${position.id}-communist`}
                    id={`position-${position.id}-communist`}
                    value={String(position.price)}
                    style={{ width: 70 }}
                    onChange={(value) =>
                        updatePosition(position, position.name, parseFloat(value), position.communistShares)
                    }
                    validate={validateFloat}
                    errorMsg={"float required"}
                />
            </TableCell>
            {transactionAccounts.map((accountID) => (
                <TableCell align="right" key={accountID}>
                    {showAdvanced ? (
                        <ShareInput
                            value={position.usages[accountID] !== undefined ? position.usages[String(accountID)] : 0}
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
                    <ShareInput
                        value={position.communistShares}
                        onChange={(value) => updatePosition(position, position.name, position.price, parseFloat(value))}
                        inputProps={{ tabIndex: -1 }}
                    />
                ) : (
                    <Checkbox
                        name="communist-checked"
                        checked={position.communistShares !== 0}
                        onChange={(event) =>
                            updatePosition(position, position.name, position.price, event.target.checked ? 1 : 0)
                        }
                        inputProps={{ tabIndex: -1 }}
                    />
                )}
            </TableCell>
            <TableCell>
                <IconButton onClick={() => copyPosition(position)} tabIndex={-1}>
                    <ContentCopy />
                </IconButton>
                <IconButton onClick={() => deletePosition(position)} tabIndex={-1}>
                    <Delete />
                </IconButton>
            </TableCell>
        </>
    );
};

interface TransactionPositionsProps {
    group: Group;
    transaction: Transaction;
}

type TransactionPositionWithLocalFlag = TransactionPosition & { isEmpty: boolean };

export const TransactionPositions: React.FC<TransactionPositionsProps> = ({ group, transaction }) => {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const [localPositionChanges, setLocalPositionChanges] = useRecoilState(
        pendingTransactionPositionChanges(transaction.id)
    );
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [positions, setPositions] = useState<TransactionPositionWithLocalFlag[]>([]);

    useEffect(() => {
        setPositions(
            transaction.positions
                .map((p) => ({ ...p, isEmpty: false }))
                .concat([
                    {
                        ...localPositionChanges.empty,
                        isEmpty: true,
                    },
                ])
        );
    }, [transaction, setPositions, localPositionChanges]);

    // find all accounts that take part in the transaction, either via debitor shares or purchase items
    // TODO: should we add creditor accounts as well?
    const positionAccounts: Array<number> = Array.from(
        new Set<number>(
            positions
                .map((item) => Object.keys(item.usages))
                .flat()
                .map((id) => parseInt(id))
        )
    );

    const [additionalPurchaseItemAccounts, setAdditionalPurchaseItemAccounts] = useState([]);
    const transactionAccounts: Array<number> = Array.from(
        new Set<number>(
            Object.keys(transaction.details.debitorShares)
                .map((id) => parseInt(id))
                .concat(positionAccounts)
                .concat(additionalPurchaseItemAccounts)
        )
    );

    const showAddAccount = transactionAccounts.length < accounts.length;

    const [showAccountSelect, setShowAccountSelect] = useState(false);

    const totalPositionValue = positions.reduce((acc, curr) => acc + curr.price, 0);
    const sharedTransactionValue = transaction.details.value - totalPositionValue;

    const purchaseItemSumForAccount = (accountID) => {
        return transaction.accountBalances[accountID] !== undefined
            ? transaction.accountBalances[accountID].positions
            : 0;
    };

    const updatePosition = (
        position: TransactionPositionWithLocalFlag,
        name: string,
        price: number,
        communistShares: number
    ) => {
        if (position.isEmpty) {
            return updateEmptyPosition(position, name, price, communistShares);
        }
        if (position.id < 0) {
            setLocalPositionChanges((currPositions) => {
                const mappedAdded = { ...currPositions.added };
                mappedAdded[position.id] = {
                    ...position,
                    name: name,
                    price: price,
                    communistShares: communistShares,
                };
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: currPositions.empty,
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                const mappedModified = { ...currPositions.modified };
                mappedModified[position.id] = {
                    ...position,
                    name: name,
                    price: price,
                    communistShares: communistShares,
                };
                return {
                    modified: mappedModified,
                    empty: currPositions.empty,
                    added: currPositions.added,
                };
            });
        }
    };

    const updatePositionUsage = (position: TransactionPositionWithLocalFlag, accountID: number, shares: number) => {
        if (position.isEmpty) {
            return updateEmptyPositionUsage(position, accountID, shares);
        }
        if (position.id < 0) {
            setLocalPositionChanges((currPositions) => {
                const mappedAdded = { ...currPositions.added };
                const usages = { ...currPositions.added[position.id].usages };
                if (shares === 0) {
                    delete usages[accountID];
                } else {
                    usages[accountID] = shares;
                }
                mappedAdded[position.id] = {
                    ...currPositions.added[position.id],
                    usages: usages,
                };
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: currPositions.empty,
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                const mappedModified = { ...currPositions.modified };
                let usages: TransactionShare;
                if (mappedModified[position.id] !== undefined) {
                    // we already did change something locally
                    usages = { ...currPositions.modified[position.id].usages };
                } else {
                    // we first need to copy
                    usages = { ...position.usages };
                }

                if (shares === 0) {
                    delete usages[accountID];
                } else {
                    usages[accountID] = shares;
                }
                mappedModified[position.id] = {
                    ...position,
                    ...currPositions.modified[position.id],
                    usages: usages,
                };
                return {
                    modified: mappedModified,
                    added: currPositions.added,
                    empty: currPositions.empty,
                };
            });
        }
    };

    const deletePosition = (position: TransactionPositionWithLocalFlag) => {
        if (position.isEmpty) {
            return resetEmptyPosition();
        }

        if (position.id < 0) {
            setLocalPositionChanges((currPositions) => {
                const mappedAdded = { ...currPositions.added };
                delete mappedAdded[position.id];
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: currPositions.empty,
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                const mappedModified = { ...currPositions.modified };
                mappedModified[position.id] = {
                    ...position,
                    deleted: true,
                };
                return {
                    modified: mappedModified,
                    added: currPositions.added,
                    empty: currPositions.empty,
                };
            });
        }
    };

    const nextEmptyPositionID = (localPositions: LocalPositionChanges) => {
        return Math.min(...Object.values(localPositions.added).map((p) => p.id), -1, localPositions.empty.id) - 1;
    };

    const resetEmptyPosition = () => {
        setLocalPositionChanges((currValue) => ({
            modified: currValue.modified,
            added: currValue.added,
            empty: {
                id: nextEmptyPositionID(currValue),
                name: "",
                price: 0,
                communistShares: 0,
                usages: {},
                deleted: false,
                hasLocalChanges: true,
            },
        }));
    };

    const updateEmptyPosition = (
        position: TransactionPositionWithLocalFlag,
        name: string,
        price: number,
        communistShares: number
    ) => {
        if (name !== "" && name != null) {
            const copyOfEmpty: TransactionPosition = {
                id: position.id,
                usages: position.usages,
                hasLocalChanges: position.hasLocalChanges,
                name: name,
                deleted: position.deleted,
                price: price,
                communistShares: communistShares,
            };
            setLocalPositionChanges((currPositions): LocalPositionChanges => {
                const mappedAdded = { ...currPositions.added };
                mappedAdded[position.id] = copyOfEmpty;
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: {
                        id: nextEmptyPositionID(currPositions),
                        name: "",
                        price: 0,
                        communistShares: 0,
                        usages: {},
                        deleted: false,
                        hasLocalChanges: true,
                    },
                };
            });
        } else {
            setLocalPositionChanges((currPositions): LocalPositionChanges => {
                return {
                    modified: currPositions.modified,
                    added: currPositions.added,
                    empty: {
                        id: position.id,
                        usages: position.usages,
                        name: name,
                        price: price,
                        communistShares: communistShares,
                        deleted: false,
                        hasLocalChanges: true,
                    },
                };
            });
        }
    };

    const updateEmptyPositionUsage = (position: TransactionPositionWithLocalFlag, accountID: number, value: number) => {
        setLocalPositionChanges((currPositions) => {
            const newUsages = { ...position.usages };
            if (value === 0) {
                delete newUsages[accountID];
            } else {
                newUsages[accountID] = value;
            }
            return {
                modified: currPositions.modified,
                added: currPositions.added,
                empty: {
                    ...position,
                    usages: newUsages,
                },
            };
        });
    };

    const copyPosition = (position: TransactionPositionWithLocalFlag) => {
        setLocalPositionChanges((currPositions) => {
            const newPosition = {
                ...position,
                id: nextEmptyPositionID(currPositions),
            };
            const mappedAdded = { ...currPositions.added };
            mappedAdded[newPosition.id] = newPosition;
            return {
                modified: currPositions.modified,
                added: mappedAdded,
                empty: currPositions.empty,
            };
        });
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
                <Typography>Positions</Typography>
                {transaction.isWip && (
                    <FormControlLabel
                        control={<Checkbox name={`show-advanced`} />}
                        checked={showAdvanced}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setShowAdvanced(event.target.checked)}
                        label="Advanced"
                    />
                )}
            </Grid>
            <TableContainer>
                <Table sx={{ minWidth: 650 }} stickyHeader aria-label="purchase items" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Price</TableCell>
                            {(transaction.isWip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" sx={{ minWidth: 80 }} key={accountID}>
                                    {accounts.find((account) => account.id === accountID).name}
                                </TableCell>
                            ))}
                            {transaction.isWip && (
                                <>
                                    {showAccountSelect && (
                                        <TableCell align="right">
                                            <AccountSelect
                                                group={group}
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
                            <TableCell align="right">Shared</TableCell>
                            {transaction.isWip && <TableCell></TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transaction.isWip
                            ? positions.map((position, idx) => (
                                  <TableRow hover key={position.id}>
                                      <PositionTableRow
                                          position={position}
                                          deletePosition={deletePosition}
                                          transactionAccounts={transactionAccounts}
                                          copyPosition={copyPosition}
                                          updatePosition={updatePosition}
                                          updatePositionUsage={updatePositionUsage}
                                          showAdvanced={showAdvanced}
                                          showAccountSelect={showAccountSelect}
                                          showAddAccount={showAddAccount}
                                      />
                                  </TableRow>
                              ))
                            : positions.map(
                                  (position) =>
                                      !position.isEmpty && (
                                          <TableRow hover key={position.id}>
                                              <TableCell>{position.name}</TableCell>
                                              <TableCell align="right" style={{ minWidth: 80 }}>
                                                  {position.price.toFixed(2)} {transaction.details.currencySymbol}
                                              </TableCell>
                                              {positionAccounts.map((accountID) => (
                                                  <TableCell align="right" key={accountID}>
                                                      {position.usages[accountID] !== undefined
                                                          ? position.usages[String(accountID)]
                                                          : 0}
                                                  </TableCell>
                                              ))}
                                              <TableCell align="right">{position.communistShares}</TableCell>
                                          </TableRow>
                                      )
                              )}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Total:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {totalPositionValue.toFixed(2)} {transaction.details.currencySymbol}
                            </TableCell>
                            {(transaction.isWip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    {purchaseItemSumForAccount(accountID).toFixed(2)}{" "}
                                    {transaction.details.currencySymbol}
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                {(
                                    positions.reduce((acc, curr) => acc + curr.price, 0) -
                                    Object.values(transaction.accountBalances).reduce(
                                        (acc, curr) => acc + curr.positions,
                                        0
                                    )
                                ).toFixed(2)}{" "}
                                {transaction.details.currencySymbol}
                            </TableCell>
                            {transaction.isWip && <TableCell></TableCell>}
                        </TableRow>
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Remaining:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {sharedTransactionValue.toFixed(2)} {transaction.details.currencySymbol}
                            </TableCell>
                            {(transaction.isWip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}></TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}></TableCell>
                            {transaction.isWip && <TableCell></TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
        </MobilePaper>
    );
};

export default TransactionPositions;
