import React, { useEffect, useState } from "react";
import {
    Alert,
    Checkbox,
    FormControlLabel,
    Grid,
    IconButton,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { useRecoilValue, useSetRecoilState } from "recoil";
import { accountsSeenByUser } from "../../../recoil/accounts";
import {
    addOrChangePurchaseItemShare,
    createPurchaseItem,
    deletePurchaseItem,
    deletePurchaseItemShare,
    updatePurchaseItem,
} from "../../../api";
import { toast } from "react-toastify";
import { makeStyles } from "@mui/styles";
import { Add, Delete, HelpOutline } from "@mui/icons-material";
import AccountSelect from "../../style/AccountSelect";
import { transactionSettings } from "../../../recoil/settings";
import { groupTransactions, updateTransaction } from "../../../recoil/transactions";

const useStyles = makeStyles((theme) => ({
    table: {
        minWidth: 650,
    },
    paper: {
        padding: theme.spacing(2),
        marginTop: theme.spacing(3),
    },
}));

function ShareInput({ value, onChange }) {
    const [currValue, setValue] = useState(0);
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

export default function PurchaseItems({ group, transaction }) {
    const classes = useStyles();
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const setTransactions = useSetRecoilState(groupTransactions(transaction.group_id));
    const purchaseItems = transaction.purchase_items
        ? transaction.purchase_items.filter((item) => !item.deleted).sort((left, right) => left.id > right.id)
        : [];
    const [showAdvanced, setShowAdvanced] = useState(false);

    // find all accounts that take part in the transaction, either via debitor shares or purchase items
    // TODO: should we add creditor items as well?
    const purchaseItemAccounts = [
        ...new Set(
            purchaseItems
                .map((item) => Object.keys(item.usages))
                .flat()
                .map((id) => parseInt(id))
        ),
    ];
    const [additionalPurchaseItemAccounts, setAdditionalPurchaseItemAccounts] = useState([]);
    const transactionAccounts = [
        ...new Set(
            Object.keys(transaction.debitor_shares)
                .map((id) => parseInt(id))
                .concat(purchaseItemAccounts)
                .concat(additionalPurchaseItemAccounts)
        ),
    ];

    const showAddAccount = transactionAccounts.length < accounts.length;

    const [showAccountSelect, setShowAccountSelect] = useState(false);
    const [itemIDMapping, setItemIDMapping] = useState({});

    const totalPurchaseItemValue = purchaseItems.reduce((acc, curr) => acc + curr.price, 0);
    const sharedTransactionValue = transaction.value - totalPurchaseItemValue;

    const transactionEditSettings = useRecoilValue(transactionSettings);
    const showMissingValueAlert = transactionEditSettings.showRemaining;

    const purchaseItemSumForAccount = (accountID) => {
        return transaction.account_balances.hasOwnProperty(accountID)
            ? transaction.account_balances[accountID].positions
            : 0;
    };

    const initialItem = () => {
        return {
            id: purchaseItems.length + 10001,
            name: "",
            price: 0,
            communist_shares: 0,
            usages: {},
        };
    };
    const [pendingItems, setPendingItems] = useState([initialItem()]);

    const resolveItemID = (itemID) => {
        if (itemIDMapping.hasOwnProperty(itemID)) {
            return itemIDMapping[itemID];
        }
        return itemID;
    };

    const allItems = purchaseItems
        .map((item) => {
            return {
                ...item,
                localID: resolveItemID(item.id),
                isPending: false,
            };
        })
        .concat(
            pendingItems.map((item) => {
                return {
                    ...item,
                    localID: resolveItemID(item.id),
                    isPending: true,
                };
            })
        )
        .sort((item1, item2) => item1.id > item2.id);

    const emptyItem = () => {
        return {
            id: pendingItems.length + purchaseItems.length + 10001,
            name: "",
            price: 0,
            communist_shares: 0,
            usages: {},
        };
    };

    const validateFloat = (value) => {
        return !(value === null || value === undefined || value === "" || isNaN(parseFloat(value)));
    };

    useEffect(() => {
        const filteredPendingItems = pendingItems.filter(
            (item) => transaction.purchase_items?.find((pItem) => pItem.id === item.id) === undefined
        );
        setPendingItems(filteredPendingItems);
    }, [transaction, setPendingItems]);

    const updateItem = (item, name, price, communistShares) => {
        if (item.isPending) {
            const newItem = {
                ...item,
                name: name,
                price: price,
                communist_shares: communistShares,
            };
            const newPendingItems = pendingItems.map((tmpItem) => (tmpItem.id === item.id ? newItem : item));
            setPendingItems(newPendingItems);

            if (name !== "" && name != null) {
                // only start submitting once we have a name
                createPurchaseItem({
                    transactionID: transaction.id,
                    name: name,
                    price: price,
                    communistShares: communistShares,
                    usages: newItem.usages,
                })
                    .then((res) => {
                        updateTransaction(res.transaction, setTransactions);
                        setItemIDMapping({
                            ...itemIDMapping,
                            [res.item_id]: item.localID,
                        });
                        let newPendingItems = pendingItems.map((tmpItem) =>
                            tmpItem.id === item.id
                                ? {
                                      ...tmpItem,
                                      id: res.item_id,
                                  }
                                : tmpItem
                        );
                        newPendingItems.push(emptyItem());
                        setPendingItems(newPendingItems);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            }
        } else {
            if (item.name === name && item.price === price && item.communist_shares === communistShares) {
                return;
            }

            if (transaction.is_wip) {
                updatePurchaseItem({
                    itemID: item.id,
                    price: price,
                    name: name,
                    communistShares: communistShares,
                })
                    .then((t) => {
                        updateTransaction(t, setTransactions);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            }
        }
    };

    const updateItemUsage = (item, accountID, shares) => {
        if (item.usages.hasOwnProperty(accountID) && item.usages[accountID] === shares) {
            return;
        }
        if (item.isPending) {
            let newUsages = {
                ...item.usages,
            };
            if (shares === 0) {
                delete newUsages[accountID];
            } else {
                newUsages[accountID] = shares;
            }

            const newItems = pendingItems.map((i) => (i.id === item.id ? { ...item, usages: newUsages } : i));
            setPendingItems(newItems);
        } else {
            if (shares === 0 && item.usages.hasOwnProperty(accountID)) {
                deletePurchaseItemShare({
                    itemID: item.id,
                    accountID: accountID,
                })
                    .then((t) => {
                        updateTransaction(t, setTransactions);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            } else if (shares > 0) {
                addOrChangePurchaseItemShare({
                    itemID: item.id,
                    accountID: accountID,
                    shareAmount: shares,
                })
                    .then((t) => {
                        updateTransaction(t, setTransactions);
                    })
                    .catch((err) => {
                        toast.error(err);
                    });
            }
        }
    };

    const deleteItem = (item) => {
        if (item.isPending) {
            const filteredItems = pendingItems.filter((tmpItem) => tmpItem.id !== item.id);
            if (filteredItems.length === 0) {
                setPendingItems([emptyItem()]);
            } else {
                setPendingItems(filteredItems);
            }
        } else {
            deletePurchaseItem({ itemID: item.id })
                .then((t) => {
                    updateTransaction(t, setTransactions);
                })
                .catch((err) => {
                    toast.error(err);
                });
        }
    };

    const addPurchaseItemAccount = (account) => {
        setShowAccountSelect(false);
        setAdditionalPurchaseItemAccounts([...new Set([...purchaseItemAccounts, parseInt(account.id)])]);
    };

    return (
        <Paper elevation={1} className={classes.paper}>
            <Grid container direction="row" justifyContent="space-between">
                <Typography>Positions</Typography>
                {transaction.is_wip && (
                    <FormControlLabel
                        control={<Checkbox name={`show-advanced`} />}
                        checked={showAdvanced}
                        onChange={(event) => setShowAdvanced(event.target.checked)}
                        label="Advanced"
                    />
                )}
            </Grid>
            <TableContainer>
                <Table className={classes.table} aria-label="purchase items" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell align="right">Price</TableCell>
                            {(transaction.is_wip ? transactionAccounts : purchaseItemAccounts).map((accountID) => (
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
                            ? allItems.map((item) => (
                                  <TableRow hover key={item.localID}>
                                      <TableCell>
                                          <WrappedTextField
                                              value={item.name}
                                              onChange={(value) =>
                                                  updateItem(item, value, item.price, item.communist_shares)
                                              }
                                              validate={(value) => value !== "" && value != null}
                                          />
                                      </TableCell>
                                      <TableCell align="right">
                                          <WrappedTextField
                                              value={item.price}
                                              style={{ width: 70 }}
                                              onChange={(value) =>
                                                  updateItem(item, item.name, parseFloat(value), item.communist_shares)
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
                                                          item.usages.hasOwnProperty(String(accountID))
                                                              ? item.usages[String(accountID)]
                                                              : 0
                                                      }
                                                      onChange={(value) => updateItemUsage(item, accountID, value)}
                                                  />
                                              ) : (
                                                  <Checkbox
                                                      name={`${accountID}-checked`}
                                                      checked={item.usages.hasOwnProperty(String(accountID))}
                                                      onChange={(event) =>
                                                          updateItemUsage(item, accountID, event.target.checked ? 1 : 0)
                                                      }
                                                  />
                                              )}
                                          </TableCell>
                                      ))}
                                      {showAccountSelect && <TableCell></TableCell>}
                                      {showAddAccount && <TableCell></TableCell>}
                                      <TableCell align="right">
                                          {showAdvanced ? (
                                              <ShareInput
                                                  value={item.communist_shares}
                                                  onChange={(value) =>
                                                      updateItem(item, item.name, item.price, parseFloat(value))
                                                  }
                                              />
                                          ) : (
                                              <Checkbox
                                                  name="communist-checked"
                                                  checked={item.communist_shares !== 0}
                                                  onChange={(event) =>
                                                      updateItem(
                                                          item,
                                                          item.name,
                                                          item.price,
                                                          event.target.checked ? 1 : 0
                                                      )
                                                  }
                                              />
                                          )}
                                      </TableCell>
                                      <TableCell>
                                          <IconButton onClick={() => deleteItem(item)}>
                                              <Delete />
                                          </IconButton>
                                      </TableCell>
                                  </TableRow>
                              ))
                            : purchaseItems.map((item) => (
                                  <TableRow hover key={item.id}>
                                      <TableCell>{item.name}</TableCell>
                                      <TableCell align="right" style={{ width: 80 }}>
                                          {item.price.toFixed(2)} {transaction.currency_symbol}
                                      </TableCell>
                                      {purchaseItemAccounts.map((accountID) => (
                                          <TableCell align="right" key={accountID}>
                                              {item.usages.hasOwnProperty(String(accountID))
                                                  ? item.usages[String(accountID)]
                                                  : 0}
                                          </TableCell>
                                      ))}
                                      <TableCell align="right">{item.communist_shares}</TableCell>
                                  </TableRow>
                              ))}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Total:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {totalPurchaseItemValue.toFixed(2)} {transaction.currency_symbol}
                            </TableCell>
                            {(transaction.is_wip ? transactionAccounts : purchaseItemAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    {purchaseItemSumForAccount(accountID).toFixed(2)} {transaction.currency_symbol}
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                {(
                                    purchaseItems.reduce((acc, curr) => acc + curr.price, 0) -
                                    Object.values(transaction.account_balances).reduce(
                                        (acc, curr) => acc + curr.positions,
                                        0
                                    )
                                ).toFixed(2)}{" "}
                                {transaction.currency_symbol}
                            </TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            {showMissingValueAlert && sharedTransactionValue > 0 && (
                <Alert
                    severity="info"
                    sx={{ marginTop: 2 }}
                    action={
                        <Tooltip title="This message can be turned off in your profile settings.">
                            <HelpOutline />
                        </Tooltip>
                    }
                >
                    Remaining transaction value to be shared:{" "}
                    <strong>
                        {sharedTransactionValue} {transaction.currency_symbol}
                    </strong>
                </Alert>
            )}
        </Paper>
    );
}
