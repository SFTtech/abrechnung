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
    Typography,
} from "@mui/material";
import { useRecoilState, useRecoilValue } from "recoil";
import { accountsSeenByUser } from "../../../state/accounts";
import { makeStyles } from "@mui/styles";
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import AccountSelect from "../../style/AccountSelect";
import { LocalPositionChanges, pendingTransactionPositionChanges, Transaction } from "../../../state/transactions";
import { MobilePaper } from "../../style/mobile";
import { Group } from "../../../state/groups";

const useStyles = makeStyles((theme) => ({
    table: {
        minWidth: 650,
    },
}));

function ShareInput({ value, onChange, ...props }) {
    const [currValue, setValue] = useState("0");
    const [error, setError] = useState(false);

    function validate(val) {
        return !(val === null || val === undefined || val === "" || isNaN(parseFloat(val)) || parseFloat(val) < 0);
    }

    useEffect(() => {
        setValue(value);
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
}

function WrappedTextField({ value, onChange, initial = null, errorMsg = null, validate = null, ...props }) {
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
    }, [value]);

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
}

function PositionTableRow({
    position,
    updatePosition,
    transactionAccounts,
    showAdvanced,
    copyPosition,
    updatePositionUsage,
    showAccountSelect,
    showAddAccount,
    deletePosition,
}) {
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
                    onChange={(value) => updatePosition(position, value, position.price, position.communist_shares)}
                    validate={(value) => value !== "" && value != null}
                />
            </TableCell>
            <TableCell key={`position-${position.id}-communist`} align="right">
                <WrappedTextField
                    key={`position-${position.id}-communist`}
                    id={`position-${position.id}-communist`}
                    value={position.price}
                    style={{ width: 70 }}
                    onChange={(value) =>
                        updatePosition(position, position.name, parseFloat(value), position.communist_shares)
                    }
                    validate={validateFloat}
                    errorMsg={"float required"}
                />
            </TableCell>
            {transactionAccounts.map((accountID) => (
                <TableCell align="right" key={accountID}>
                    {showAdvanced ? (
                        <ShareInput
                            value={
                                position.usages.hasOwnProperty(String(accountID))
                                    ? position.usages[String(accountID)]
                                    : 0
                            }
                            onChange={(value) => updatePositionUsage(position, accountID, value)}
                            inputProps={{ tabIndex: -1 }}
                        />
                    ) : (
                        <Checkbox
                            name={`${accountID}-checked`}
                            checked={position.usages.hasOwnProperty(String(accountID))}
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
                        value={position.communist_shares}
                        onChange={(value) => updatePosition(position, position.name, position.price, parseFloat(value))}
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
}

export interface PropTypes {
    group: Group;
    transaction: Transaction;
}

export default function PurchaseItems({ group, transaction }: PropTypes) {
    const classes = useStyles();
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const [localPositionChanges, setLocalPositionChanges] = useRecoilState(
        pendingTransactionPositionChanges(transaction.id)
    );
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [positions, setPositions] = useState([]);

    useEffect(() => {
        setPositions(
            transaction.positions
                .map((p) => ({ ...p, is_empty: false }))
                .concat([
                    {
                        ...localPositionChanges.empty,
                        is_empty: true,
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
        return transaction.account_balances.hasOwnProperty(accountID)
            ? transaction.account_balances[accountID].positions
            : 0;
    };

    const updatePosition = (position, name, price, communistShares) => {
        if (position.is_empty) {
            return updateEmptyPosition(position, name, price, communistShares);
        }
        if (position.only_local) {
            setLocalPositionChanges((currPositions) => {
                let mappedAdded = { ...currPositions.added };
                mappedAdded[position.id] = {
                    ...position,
                    name: name,
                    price: price,
                    communist_shares: communistShares,
                };
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: currPositions.empty,
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                let mappedModified = { ...currPositions.modified };
                mappedModified[position.id] = {
                    ...position,
                    name: name,
                    price: price,
                    communist_shares: communistShares,
                };
                return {
                    modified: mappedModified,
                    empty: currPositions.empty,
                    added: currPositions.added,
                };
            });
        }
    };

    const updatePositionUsage = (position, accountID, shares) => {
        if (position.is_empty) {
            return updateEmptyPositionUsage(position, accountID, shares);
        }
        if (position.only_local) {
            setLocalPositionChanges((currPositions) => {
                let mappedAdded = { ...currPositions.added };
                let usages = { ...currPositions.added[position.id].usages };
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
                let mappedModified = { ...currPositions.modified };
                let usages;
                if (mappedModified.hasOwnProperty(position.id)) {
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

    const deletePosition = (position) => {
        if (position.is_empty) {
            return resetEmptyPosition();
        }

        if (position.only_local) {
            setLocalPositionChanges((currPositions) => {
                let mappedAdded = { ...currPositions.added };
                delete mappedAdded[position.id];
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: currPositions.empty,
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                let mappedModified = { ...currPositions.modified };
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
                communist_shares: 0,
                usages: {},
                deleted: false,
            },
        }));
    };

    const updateEmptyPosition = (position, name, price, communistShares) => {
        if (name !== "" && name != null) {
            const copyOfEmpty = { ...position, name: name, price: price, communist_shares: communistShares };
            setLocalPositionChanges((currPositions) => {
                let mappedAdded = { ...currPositions.added };
                mappedAdded[position.id] = copyOfEmpty;
                return {
                    modified: currPositions.modified,
                    added: mappedAdded,
                    empty: {
                        id: nextEmptyPositionID(currPositions),
                        name: "",
                        price: 0,
                        communist_shares: 0,
                        usages: {},
                        deleted: false,
                    },
                };
            });
        } else {
            setLocalPositionChanges((currPositions) => {
                return {
                    modified: currPositions.modified,
                    added: currPositions.added,
                    empty: {
                        ...position,
                        name: name,
                        price: price,
                        communist_shares: communistShares,
                    },
                };
            });
        }
    };

    const updateEmptyPositionUsage = (position, accountID, value) => {
        setLocalPositionChanges((currPositions) => {
            let newUsages = { ...position.usages };
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

    const copyPosition = (position) => {
        setLocalPositionChanges((currPositions) => {
            const newPosition = {
                ...position,
                id: nextEmptyPositionID(currPositions),
            };
            let mappedAdded = { ...currPositions.added };
            mappedAdded[newPosition.id] = newPosition;
            return {
                modified: currPositions.modified,
                added: mappedAdded,
                empty: currPositions.empty,
            };
        });
    };

    const addPurchaseItemAccount = (account) => {
        setShowAccountSelect(false);
        setAdditionalPurchaseItemAccounts((currAdditionalAccounts) =>
            Array.from(new Set<number>([...currAdditionalAccounts, parseInt(account.id)]))
        );
    };

    return (
        <MobilePaper sx={{ marginTop: 2 }}>
            <Grid container direction="row" justifyContent="space-between">
                <Typography>Positions</Typography>
                {transaction.is_wip && (
                    <FormControlLabel
                        control={<Checkbox name={`show-advanced`} />}
                        checked={showAdvanced}
                        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setShowAdvanced(event.target.checked)}
                        label="Advanced"
                    />
                )}
            </Grid>
            <TableContainer>
                <Table className={classes.table} stickyHeader aria-label="purchase items" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Price</TableCell>
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
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {transaction.is_wip
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
                                      !position.is_empty && (
                                          <TableRow hover key={position.id}>
                                              <TableCell>{position.name}</TableCell>
                                              <TableCell align="right" style={{ minWidth: 80 }}>
                                                  {position.price.toFixed(2)} {transaction.currency_symbol}
                                              </TableCell>
                                              {positionAccounts.map((accountID) => (
                                                  <TableCell align="right" key={accountID}>
                                                      {position.usages.hasOwnProperty(String(accountID))
                                                          ? position.usages[String(accountID)]
                                                          : 0}
                                                  </TableCell>
                                              ))}
                                              <TableCell align="right">{position.communist_shares}</TableCell>
                                          </TableRow>
                                      )
                              )}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Total:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {totalPositionValue.toFixed(2)} {transaction.currency_symbol}
                            </TableCell>
                            {(transaction.is_wip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    {purchaseItemSumForAccount(accountID).toFixed(2)} {transaction.currency_symbol}
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                {(
                                    positions.reduce((acc, curr) => acc + curr.price, 0) -
                                    Object.values(transaction.account_balances).reduce(
                                        (acc, curr) => acc + curr.positions,
                                        0
                                    )
                                ).toFixed(2)}{" "}
                                {transaction.currency_symbol}
                            </TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Remaining:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {sharedTransactionValue.toFixed(2)} {transaction.currency_symbol}
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
}
