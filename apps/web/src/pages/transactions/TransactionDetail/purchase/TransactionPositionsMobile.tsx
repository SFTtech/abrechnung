import { MobilePaper } from "@/components/style";
import { CurrencyDisplay } from "@/components";
import {
    selectAccountIdToAccountMap,
    selectTransactionPositionTotal,
    useTransaction,
    useTransactionPositions,
    wipPositionAdded,
} from "@abrechnung/redux";
import {
    Box,
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
import { PositionTableRowMobile } from "./PositionTableRowMobile";
import { Add } from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "@/store";
import { TransactionPosition } from "@abrechnung/types";
import { PositionEditDialog } from "./PositionEditDialog";
import { getAccountSortFunc } from "@abrechnung/core";

interface TransactionPositionsMobileProps {
    groupId: number;
    transactionId: number;
    validationErrors?: ValidationErrors;
}

export const TransactionPositionsMobile: React.FC<TransactionPositionsMobileProps> = ({
    groupId,
    transactionId,
    validationErrors,
}) => {
    const { t } = useTranslation();
    const dispatch = useAppDispatch();
    const transaction = useTransaction(groupId, transactionId)!;
    const accountIDMap = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));
    const positions = useTransactionPositions(groupId, transactionId);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [editedPositionId, setEditedPositionId] = useState<number | undefined>(undefined);

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

    const totalPositionValue = useAppSelector((state) => selectTransactionPositionTotal(state, groupId, transactionId));
    const remainingPositionValue = transaction.value - totalPositionValue;

    const addPosition = () => {
        dispatch(
            wipPositionAdded({
                groupId,
                transactionId,
                position: { name: "", price: 0.0, communist_shares: 0, usages: {} },
            })
        )
            .unwrap()
            .then(({ position: newPosition }) => {
                setEditedPositionId(newPosition.id);
                setShowEditDialog(true);
            });
    };

    const onEditPosition = (position: TransactionPosition) => {
        setEditedPositionId(position.id);
        setShowEditDialog(true);
    };

    return (
        <MobilePaper sx={{ marginTop: 2 }}>
            <Grid container direction="row" justifyContent="space-between">
                <Typography>{t("transactions.positions.positions")}</Typography>
            </Grid>
            <TableContainer>
                <Table stickyHeader aria-label="purchase items" size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>{t("common.name")}</TableCell>
                            <TableCell align="right">{t("common.price")}</TableCell>
                            {transaction.is_wip && <TableCell></TableCell>}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {positions.map((position) => (
                            <PositionTableRowMobile
                                key={position.id}
                                position={position}
                                transaction={transaction}
                                onEdit={onEditPosition}
                                validationError={validationErrors?.[position.id]}
                            />
                        ))}
                        {transaction.is_wip && (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Box sx={{ display: "flex", justifyContent: "center" }}>
                                        <IconButton onClick={addPosition} color="primary">
                                            <Add />
                                        </IconButton>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
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
                                    amount={remainingPositionValue}
                                    currencyIdentifier={transaction.currency_identifier}
                                />
                            </TableCell>
                            {/* Next table column is the actions */}
                            {transaction.is_wip && <TableCell width="120px"></TableCell>}
                        </TableRow>
                    </TableBody>
                </Table>
            </TableContainer>
            {transaction.is_wip && (
                <PositionEditDialog
                    transaction={transaction}
                    open={showEditDialog}
                    onClose={() => setShowEditDialog(false)}
                    positionId={editedPositionId}
                    validationError={editedPositionId != null ? validationErrors?.[editedPositionId] : undefined}
                    shownAccountIds={shownAccountIds}
                    updateShownAccountIds={setShownAccountIds}
                />
            )}
        </MobilePaper>
    );
};
