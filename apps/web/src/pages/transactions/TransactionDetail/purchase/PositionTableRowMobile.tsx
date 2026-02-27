import { Transaction, TransactionPosition } from "@abrechnung/types";
import { ContentCopy, Delete } from "@mui/icons-material";
import { FormHelperText, IconButton, TableCell, TableRow, useTheme } from "@mui/material";
import React from "react";
import { PositionValidationError } from "./types";
import { CurrencyDisplay } from "@/components";
import { useAppDispatch, useAppSelector } from "@/store";
import { positionDeleted, selectAccountIdToAccountMap, wipPositionAdded } from "@abrechnung/redux";
import { Trans, useTranslation } from "react-i18next";

interface PositionTableRowMobileProps {
    transaction: Transaction;
    position: TransactionPosition;
    onEdit: (position: TransactionPosition) => void;
    validationError?: PositionValidationError;
}

export const PositionTableRowMobile: React.FC<PositionTableRowMobileProps> = ({
    transaction,
    position,
    onEdit,
    validationError,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const dispatch = useAppDispatch();
    const accounts = useAppSelector((state) => selectAccountIdToAccountMap(state, transaction.group_id));

    const usageNames = Object.keys(position.usages)
        .map((accountId) => accounts[Number(accountId)]?.name)
        .concat(position.communist_shares > 0 ? [t("common.shared")] : [])
        .join(", ");

    const error = validationError !== undefined;

    const deletePosition = (position: TransactionPosition) => {
        if (!transaction.is_wip) {
            return;
        }
        dispatch(
            positionDeleted({ groupId: transaction.group_id, transactionId: transaction.id, positionId: position.id })
        );
    };

    const copyPosition = (position: TransactionPosition) => {
        if (!transaction.is_wip) {
            return;
        }
        dispatch(
            wipPositionAdded({
                groupId: transaction.group_id,
                transactionId: transaction.id,
                position: { ...position, name: `${position.name} (${t("common.copy")})` },
            })
        );
    };
    const editPosition = () => {
        if (transaction.is_wip) {
            onEdit(position);
        }
    };

    return (
        <TableRow
            hover
            onClick={editPosition}
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
                {position.name}
                <br />
                <Trans i18nKey="transactions.positions.usagesFor" values={{ for: usageNames }} />
            </TableCell>
            <TableCell align="right">
                <CurrencyDisplay amount={position.price} currencyIdentifier={transaction.currency_identifier} />
            </TableCell>
            {transaction.is_wip && (
                <TableCell>
                    <IconButton
                        color="primary"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            copyPosition(position);
                        }}
                    >
                        <ContentCopy />
                    </IconButton>
                    <IconButton
                        color="error"
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deletePosition(position);
                        }}
                    >
                        <Delete />
                    </IconButton>
                </TableCell>
            )}
        </TableRow>
    );
};
