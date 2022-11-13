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
import { Add, ContentCopy, Delete } from "@mui/icons-material";
import AccountSelect from "../../style/AccountSelect";
import { MobilePaper } from "../../style/mobile";
import { Account, TransactionPosition } from "@abrechnung/types";
import { useAppSelector, selectAccountSlice, selectTransactionSlice, useAppDispatch } from "../../../store";
import {
    selectGroupAccounts,
    selectTransactionById,
    positionDeleted,
    selectTransactionBalanceEffect,
    wipPositionUpdated,
    wipPositionAdded,
    selectTransactionPositionsWithEmpty,
} from "@abrechnung/redux";

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
        if (!error && parseFloat(currValue) !== value) {
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
    initial = "",
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
        if (!error && value !== currValue) {
            console.log("old value", value, "new value", currValue);
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
    position: TransactionPosition;
    updatePosition: (
        position: TransactionPosition,
        newName: string,
        newPrice: number,
        newCommunistShares: number
    ) => void;
    transactionAccounts: number[];
    showAdvanced: boolean;
    copyPosition: (position: TransactionPosition) => void;
    updatePositionUsage: (position: TransactionPosition, accountID: number, usages: number) => void;
    showAccountSelect: boolean;
    showAddAccount: boolean;
    deletePosition: (position: TransactionPosition) => void;
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
    groupId: number;
    transactionId: number;
}

export const TransactionPositions: React.FC<TransactionPositionsProps> = ({ groupId, transactionId }) => {
    const accounts = useAppSelector((state) => selectGroupAccounts({ state: selectAccountSlice(state), groupId }));
    const transaction = useAppSelector((state) =>
        selectTransactionById({ state: selectTransactionSlice(state), groupId, transactionId })
    );
    const positions = useAppSelector((state) =>
        selectTransactionPositionsWithEmpty({ state: selectTransactionSlice(state), groupId, transactionId })
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
            Object.keys(transaction.debitorShares)
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

    const updatePosition = (position: TransactionPosition, name: string, price: number, communistShares: number) => {
        dispatch(
            wipPositionUpdated({ groupId, transactionId, position: { ...position, name, price, communistShares } })
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
                            : positions.map((position) => (
                                  <TableRow hover key={position.id}>
                                      <TableCell>{position.name}</TableCell>
                                      <TableCell align="right" style={{ minWidth: 80 }}>
                                          {position.price.toFixed(2)} {transaction.currencySymbol}
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
                              ))}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Total:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {totalPositionValue.toFixed(2)} {transaction.currencySymbol}
                            </TableCell>
                            {(transaction.isWip ? transactionAccounts : positionAccounts).map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    {purchaseItemSumForAccount(accountID).toFixed(2)} {transaction.currencySymbol}
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                {(
                                    positions.reduce((acc, curr) => acc + curr.price, 0) -
                                    Object.values(transactionBalanceEffect).reduce(
                                        (acc, curr) => acc + curr.positions,
                                        0
                                    )
                                ).toFixed(2)}{" "}
                                {transaction.currencySymbol}
                            </TableCell>
                            {transaction.isWip && <TableCell></TableCell>}
                        </TableRow>
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>Remaining:</Typography>
                            </TableCell>
                            <TableCell align="right">
                                {sharedTransactionValue.toFixed(2)} {transaction.currencySymbol}
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
