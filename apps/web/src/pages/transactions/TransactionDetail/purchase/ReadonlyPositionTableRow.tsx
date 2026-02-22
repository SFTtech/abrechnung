import { CurrencyDisplay } from "@/components";
import { Transaction, TransactionPosition } from "@abrechnung/types";
import { Checkbox, TableCell, TableRow } from "@mui/material";
import * as React from "react";

interface ReadonlyPositionTableRowProps {
    transaction: Transaction;
    position: TransactionPosition;
    positionsHaveComplexShares: boolean;
    shownAccountIDs: number[];
}

export const ReadonlyPositionTableRow: React.FC<ReadonlyPositionTableRowProps> = ({
    transaction,
    position,
    positionsHaveComplexShares,
    shownAccountIDs,
}) => {
    return (
        <TableRow hover key={position.id}>
            <TableCell>{position.name}</TableCell>
            <TableCell align="right" style={{ minWidth: 80 }}>
                <CurrencyDisplay amount={position.price} currencyIdentifier={transaction.currency_identifier} />
            </TableCell>
            {shownAccountIDs.map((accountID) => (
                <TableCell align="right" key={accountID}>
                    {positionsHaveComplexShares ? (
                        position.usages[accountID] !== undefined ? (
                            position.usages[String(accountID)]
                        ) : (
                            0
                        )
                    ) : (
                        <Checkbox checked={(position.usages[accountID] ?? 0) !== 0} disabled={true} />
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
    );
};
