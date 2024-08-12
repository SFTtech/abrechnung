import { AccountSelect } from "@/components/AccountSelect";
import { MobilePaper } from "@/components/style/mobile";
import { useFormatCurrency } from "@/hooks";
import { RootState, selectAccountSlice, selectTransactionSlice, useAppDispatch, useAppSelector } from "@/store";
import { getAccountSortFunc } from "@abrechnung/core";
import {
    positionDeleted,
    selectAccountIdToAccountMap,
    selectGroupAccounts,
    selectTransactionBalanceEffect,
    selectTransactionById,
    selectWipTransactionPositions,
    wipPositionAdded,
    wipPositionUpdated,
} from "@abrechnung/redux";
import { Account, TransactionPosition } from "@abrechnung/types";
import { Add } from "@mui/icons-material";
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
    Typography,
} from "@mui/material";
import memoize from "proxy-memoize";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { ValidationErrors } from "./types";
import { PositionTableRow } from "./PositionTableRow";

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
    const accountIDMap = useAppSelector((state) =>
        selectAccountIdToAccountMap({ state: selectAccountSlice(state), groupId })
    );
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

    const [additionalPurchaseItemAccounts, setAdditionalPurchaseItemAccounts] = useState([]);

    const { shownAccounts, shownAccountIDs } = React.useMemo(() => {
        let accountIDsToShow: number[] = Array.from(
            new Set<number>(
                positions
                    .map((item) => Object.keys(item.usages))
                    .flat()
                    .map((id) => parseInt(id))
            )
        );
        if (transaction.is_wip) {
            accountIDsToShow = Array.from(
                new Set<number>(
                    Object.keys(transaction.debitor_shares)
                        .map((id) => parseInt(id))
                        .concat(accountIDsToShow)
                        .concat(additionalPurchaseItemAccounts)
                )
            );
        }

        return {
            shownAccounts: accountIDsToShow.map((id) => accountIDMap[id]).sort(getAccountSortFunc("name")),
            shownAccountIDs: accountIDsToShow,
        };
    }, [transaction, positions, additionalPurchaseItemAccounts, accountIDMap]);

    const showAddAccount = shownAccounts.length < accounts.length;

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
                            {shownAccounts.map((acc) => (
                                <TableCell align="right" sx={{ minWidth: 80 }} key={acc.id}>
                                    {acc.name}
                                </TableCell>
                            ))}
                            {transaction.is_wip && (
                                <>
                                    {showAccountSelect && (
                                        <TableCell align="right">
                                            <AccountSelect
                                                groupId={groupId}
                                                exclude={shownAccountIDs}
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
                                      currencySymbol={transaction.currency_symbol}
                                      deletePosition={deletePosition}
                                      shownAccounts={shownAccounts}
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
                                      {shownAccountIDs.map((accountID) => (
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
                            {shownAccountIDs.map((accountID) => (
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
                            {shownAccountIDs.map((accountID) => (
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
