import { NumericInput } from "@abrechnung/components";
import { TextInput } from "@/components/TextInput";
import { Account, TransactionPosition } from "@abrechnung/types";
import { ContentCopy, Delete } from "@mui/icons-material";
import { Checkbox, FormHelperText, IconButton, InputAdornment, TableCell, TableRow, useTheme } from "@mui/material";
import React from "react";
import { PositionValidationError } from "./types";

interface PositionTableRowProps {
    currencySymbol: string;
    position: TransactionPosition;
    updatePosition: (
        position: TransactionPosition,
        newName: string,
        newPrice: number,
        newcommunist_shares: number
    ) => void;
    shownAccounts: Account[];
    showAdvanced: boolean;
    copyPosition: (position: TransactionPosition) => void;
    updatePositionUsage: (position: TransactionPosition, accountID: number, usages: number) => void;
    showAccountSelect: boolean;
    showAddAccount: boolean;
    deletePosition: (position: TransactionPosition) => void;
    validationError?: PositionValidationError;
}

export const PositionTableRow: React.FC<PositionTableRowProps> = ({
    position,
    updatePosition,
    shownAccounts,
    showAdvanced,
    copyPosition,
    updatePositionUsage,
    showAccountSelect,
    showAddAccount,
    deletePosition,
    validationError,
    currencySymbol,
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
                {validationError && validationError.fieldErrors["communist_shares"] && (
                    <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                        {validationError.fieldErrors["communist_shares"]}
                    </FormHelperText>
                )}
                {validationError && validationError.fieldErrors["usages"] && (
                    <FormHelperText sx={{ marginLeft: 0 }} error={true}>
                        {validationError.fieldErrors["usages"]}
                    </FormHelperText>
                )}
                <TextInput
                    value={position.name}
                    error={validationError && !!validationError.fieldErrors["name"]}
                    helperText={validationError && validationError.fieldErrors["name"]}
                    onChange={(value) => updatePosition(position, value, position.price, position.communist_shares)}
                />
            </TableCell>
            <TableCell align="right">
                <NumericInput
                    value={position.price}
                    isCurrency={true}
                    style={{ width: 70 }}
                    error={validationError && !!validationError.fieldErrors["price"]}
                    helperText={validationError && validationError.fieldErrors["price"]}
                    onChange={(value) => updatePosition(position, position.name, value, position.communist_shares)}
                    InputProps={{ endAdornment: <InputAdornment position="end">{currencySymbol}</InputAdornment> }}
                />
            </TableCell>
            {shownAccounts.map((account) => (
                <TableCell align="right" key={account.id}>
                    {showAdvanced ? (
                        <NumericInput
                            sx={{ maxWidth: 50 }}
                            value={(position.usages[account.id] ?? 0) !== 0 ? position.usages[account.id] : 0}
                            error={validationError && !!validationError.fieldErrors["usages"]}
                            onChange={(value) => updatePositionUsage(position, account.id, value)}
                            inputProps={{ tabIndex: -1 }}
                        />
                    ) : (
                        <Checkbox
                            name={`${account.id}-checked`}
                            checked={(position.usages[account.id] ?? 0) !== 0}
                            onChange={(event) =>
                                updatePositionUsage(position, account.id, event.target.checked ? 1 : 0)
                            }
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
                        error={validationError && !!validationError.fieldErrors["communist_shares"]}
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
