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
            description: acc.description,
            balance: balances[acc.id]?.balance ?? 0,
            totalPaid: balances[acc.id]?.totalPaid ?? 0,
            totalConsumed: balances[acc.id]?.totalConsumed ?? 0,
        };
    });

    const columns: GridColDef[] = [
        { field: "id", headerName: "ID" },
        { field: "name", headerName: "Name", width: 150 },
        { field: "description", headerName: "Description", width: 200 },
        {
            field: "totalConsumed",
            headerName: t("balanceTable.totalConsumed"),
            renderCell: renderCurrency(group.currency_symbol, "red"),
        },
        {
            field: "totalPaid",
            headerName: t("balanceTable.totalPaid"),
            renderCell: renderCurrency(group.currency_symbol, "green"),
        },
        {
            field: "balance",
            headerName: t("balanceTable.balance"),
            renderCell: renderCurrency(group.currency_symbol),
        },
    ];

    return (
        <div style={{ width: "100%" }}>
            <DataGrid
                sx={{ border: 0 }}
                rows={tableData}
                initialState={{
                    columns: {
                        columnVisibilityModel: {
                            id: false,
                        },
                    },
                }}
                columns={columns}
                disableRowSelectionOnClick
                autoHeight
                slots={{
                    toolbar: GridToolbar,
                }}
            />
        </div>
    );
};
