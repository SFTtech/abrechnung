import { selectAccountSlice, selectGroupSlice, useAppSelector } from "@/store";
import { selectAccountBalances, selectGroupById, selectSortedAccounts } from "@abrechnung/redux";
import { DataGrid, GridColDef, GridToolbar } from "@mui/x-data-grid";
import React from "react";
import { renderCurrency } from "../style/datagrid/renderCurrency";

interface Props {
    groupId: number;
}

export const BalanceTable: React.FC<Props> = ({ groupId }) => {
    const personalAccounts = useAppSelector((state) =>
        selectSortedAccounts({ state: selectAccountSlice(state), groupId, type: "personal", sortMode: "name" })
    );
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const balances = useAppSelector((state) => selectAccountBalances({ state, groupId }));

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
            headerName: "Received / Consumed",
            renderCell: renderCurrency(group.currency_symbol, "red"),
        },
        {
            field: "totalPaid",
            headerName: "Paid",
            renderCell: renderCurrency(group.currency_symbol, "green"),
        },
        {
            field: "balance",
            headerName: "Balance",
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

export default BalanceTable;
