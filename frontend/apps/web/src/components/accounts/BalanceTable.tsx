import { useAppSelector } from "@/store";
import { selectAccountBalances, useSortedAccounts } from "@abrechnung/redux";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import React from "react";
import { renderCurrency } from "../style/datagrid/renderCurrency";
import { useTranslation } from "react-i18next";
import { Group } from "@abrechnung/api";

interface Props {
    group: Group;
}

export const BalanceTable: React.FC<Props> = ({ group }) => {
    const { t } = useTranslation();
    const personalAccounts = useSortedAccounts(group.id, "name", "personal");
    const balances = useAppSelector((state) => selectAccountBalances(state, group.id));

    const tableData = personalAccounts.map((acc) => {
        return {
            id: acc.id,
            name: acc.name,
            balance: balances[acc.id]?.balance ?? 0,
            totalPaid: balances[acc.id]?.totalPaid ?? 0,
            totalConsumed: balances[acc.id]?.totalConsumed ?? 0,
        };
    });

    const columns: GridColDef[] = [
        { field: "name", headerName: "Name", flex: 1 },
        {
            field: "totalConsumed",
            headerName: t("balanceTable.totalConsumed"),
            renderCell: renderCurrency(group.currency_symbol, -1),
        },
        {
            field: "totalPaid",
            headerName: t("balanceTable.totalPaid"),
            renderCell: renderCurrency(group.currency_symbol, 1),
        },
        {
            field: "balance",
            headerName: t("balanceTable.balance"),
            renderCell: renderCurrency(group.currency_symbol),
        },
    ];

    return (
        <div style={{ width: "100%", display: "flex", flexDirection: "column" }}>
            <DataGrid
                getRowId={(row) => row.id}
                sx={{ border: 0 }}
                rows={tableData}
                columns={columns}
                disableRowSelectionOnClick
                slots={{
                    toolbar: GridToolbar,
                }}
            />
        </div>
    );
};
