import { AccountSelect } from "@/components/AccountSelect";
import { MobilePaper } from "@/components/style";
import { CurrencyDisplay } from "@/components";
import { useAppDispatch, useAppSelector } from "@/store";
import { getAccountSortFunc } from "@abrechnung/core";
import {
    positionDeleted,
    selectAccountIdToAccountMap,
    selectTransactionBalanceEffect,
    selectTransactionPositionTotal,
    useGroupAccounts,
    useTransaction,
    useWipTransactionPositions,
    wipPositionAdded,
    wipPositionUpdated,
} from "@abrechnung/redux";
import { Account, TransactionPosition } from "@abrechnung/types";
import { Add, Delete } from "@mui/icons-material";
import {
    Box,
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
    Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ValidationErrors } from "./types";
import { EditablePositionTableRow } from "./EditablePositionTableRow";
import { ReadonlyPositionTableRow } from "./ReadonlyPositionTableRow";

interface TransactionPositionsProps {
    groupId: number;
    transactionId: number;
    validationErrors?: ValidationErrors;
}

export const TransactionPositions: React.FC<TransactionPositionsProps> = ({
    groupId,
    transactionId,
    validationErrors,
}) => {
    const { t } = useTranslation();
    const accounts = useGroupAccounts(groupId);
    const accountIDMap = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));
    const transaction = useTransaction(groupId, transactionId)!;
    const positions = useWipTransactionPositions(groupId, transactionId);
    const positionsHaveComplexShares = React.useMemo(() => {
        return positions.reduce(
            (hasComplex, position) =>
                hasComplex ||
                (position.communist_shares !== 0 && position.communist_shares !== 1) ||
                Object.values(position.usages).reduce((nonOne, usage) => nonOne || (usage !== 0 && usage !== 1), false),
            false
        );
    }, [positions]);

    const transactionBalanceEffect = useAppSelector((state) =>
        selectTransactionBalanceEffect(state, groupId, transactionId)
    );

    const dispatch = useAppDispatch();
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [shownAccountIds, setShownAccountIds] = useState<number[]>([]);
    const shownAccountIdsFromTransaction = React.useMemo(() => {
        let accountIdsFromPositions: number[] = positions
            .map((item) => Object.keys(item.usages))
            .flat()
            .map((id) => parseInt(id));

        let accountIdsFromDebitorShares: number[] = [];
        if (transaction.is_wip) {
            accountIdsFromDebitorShares = Object.keys(transaction.debitor_shares).map((id) => parseInt(id));
        }

        return Array.from(new Set<number>([...accountIdsFromPositions, ...accountIdsFromDebitorShares]));
    }, [transaction, positions]);

    React.useEffect(() => {
        setShownAccountIds((currAdditionalAccounts: number[]) => {
            const sortFunc = getAccountSortFunc("name");
            const sortedShownAccounts = [...shownAccountIdsFromTransaction].sort((acc1Id: number, acc2Id: number) =>
                sortFunc(accountIDMap[acc1Id], accountIDMap[acc2Id])
            );
            const allAccountIds = Array.from(new Set<number>([...currAdditionalAccounts, ...sortedShownAccounts]));
            return allAccountIds;
        });
    }, [shownAccountIdsFromTransaction, accountIDMap]);

    const shownAccounts = React.useMemo(() => {
        return shownAccountIds.map((id) => accountIDMap[id]);
    }, [shownAccountIds]);

    const showAddAccount = shownAccounts.length < accounts.length;

    const [showAccountSelect, setShowAccountSelect] = useState(false);

    const totalPositionValue = useAppSelector((state) => selectTransactionPositionTotal(state, groupId, transactionId));
    const totalPositionSharedValue = positions.reduce(
        (currTotal, position) => currTotal + position.price * position.communist_shares,
        0
    );
    const sharedTransactionValue = transaction.value - totalPositionValue;

    const purchaseItemSumForAccount = (accountID: number) => {
        return transactionBalanceEffect[accountID] !== undefined ? transactionBalanceEffect[accountID].positions : 0;
    };

    const updatePosition = (position: TransactionPosition, name: string, price: number, communist_shares: number) => {
        dispatch(
            wipPositionUpdated({
                groupId,
                transactionId,
                position: { ...position, name, price, communist_shares },
            })
        );
    };

    const updatePositionUsage = (position: TransactionPosition, accountID: number, shares: number) => {
        const usages = { ...position.usages };
        if (shares === 0) {
            delete usages[accountID];
        } else {
            usages[accountID] = shares;
        }
        dispatch(
            wipPositionUpdated({
                groupId,
                transactionId,
                position: { ...position, usages },
            })
        );
    };

    const deletePosition = (position: TransactionPosition) => {
        dispatch(positionDeleted({ groupId, transactionId, positionId: position.id }));
    };

    const copyPosition = (position: TransactionPosition) => {
        dispatch(wipPositionAdded({ groupId, transactionId, position }));
    };

    const addPurchaseItemAccount = (account: Account) => {
        setShowAccountSelect(false);
        setShownAccountIds((currAdditionalAccounts: number[]) =>
            Array.from(new Set<number>([...currAdditionalAccounts, account.id]))
        );
    };

    const removeAccountFromShown = (account: Account) => {
        setShownAccountIds((currAdditionalAccounts: number[]) =>
            currAdditionalAccounts.filter((id) => id !== account.id)
        );
    };

    return (
        <MobilePaper sx={{ marginTop: 2 }}>
            <Grid container direction="row" justifyContent="space-between">
                <Typography>{t("transactions.positions.positions")}</Typography>
                {transaction.is_wip && (
                    <FormControlLabel
                        control={
                            <Checkbox
                                name="show-advanced"
                                onChange={(event) => setShowAdvanced(event.target.checked)}
                            />
                        }
                        checked={showAdvanced}
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
                            {shownAccounts.map((acc) => (
                                <TableCell align="right" sx={{ minWidth: 80 }} key={acc.id}>
                                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "end" }}>
                                        <span>{acc.name}</span>
                                        {transaction.is_wip && !shownAccountIdsFromTransaction.includes(acc.id) && (
                                            <IconButton onClick={() => removeAccountFromShown(acc)}>
                                                <Delete />
                                            </IconButton>
                                        )}
                                    </Box>
                                </TableCell>
                            ))}
                            {transaction.is_wip && (
                                <>
                                    {showAccountSelect && (
                                        <TableCell align="right">
                                            <AccountSelect
                                                groupId={groupId}
                                                exclude={shownAccountIds}
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
                            ? positions.map((position, index) => (
                                  <EditablePositionTableRow
                                      key={position.id}
                                      position={position}
                                      currencyIdentifier={transaction.currency_identifier}
                                      deletePosition={deletePosition}
                                      shownAccounts={shownAccounts}
                                      copyPosition={copyPosition}
                                      updatePosition={updatePosition}
                                      updatePositionUsage={updatePositionUsage}
                                      showAdvanced={showAdvanced}
                                      showAccountSelect={showAccountSelect}
                                      showAddAccount={showAddAccount}
                                      validationError={validationErrors?.[position.id]}
                                      isLastRow={index === positions.length - 1}
                                  />
                              ))
                            : positions.map((position) => (
                                  <ReadonlyPositionTableRow
                                      key={position.id}
                                      transaction={transaction}
                                      position={position}
                                      shownAccountIDs={shownAccountIds}
                                      positionsHaveComplexShares={positionsHaveComplexShares}
                                  />
                              ))}
                        <TableRow hover>
                            <TableCell>
                                <Typography sx={{ fontWeight: "bold" }}>{t("common.totalWithColon")}</Typography>
                            </TableCell>
                            <TableCell align="right">
                                <CurrencyDisplay
                                    amount={totalPositionValue}
                                    currencyIdentifier={transaction.currency_identifier}
                                />
                            </TableCell>
                            {shownAccountIds.map((accountID) => (
                                <TableCell align="right" key={accountID}>
                                    <CurrencyDisplay
                                        amount={purchaseItemSumForAccount(accountID)}
                                        currencyIdentifier={transaction.currency_identifier}
                                    />
                                </TableCell>
                            ))}
                            <TableCell align="right" colSpan={showAddAccount ? 2 : 1}>
                                <CurrencyDisplay
                                    amount={totalPositionSharedValue}
                                    currencyIdentifier={transaction.currency_identifier}
                                />
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
                                <CurrencyDisplay
                                    amount={sharedTransactionValue}
                                    currencyIdentifier={transaction.currency_identifier}
                                />
                            </TableCell>
                            {shownAccountIds.map((accountID) => (
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
