import { useRecoilValue } from "recoil";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { personalAccountsSeenByUser } from "../../state/accounts";
import { accountBalances } from "../../state/transactions";
import { renderCurrency } from "../style/datagrid/renderCurrency";

export default function BalanceTable({ group }) {
    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const tableData = personalAccounts.map((acc) => {
        return {
            ...acc,
            balance: balances[acc.id].balance,
            totalPaid: balances[acc.id].totalPaid,
            totalConsumed: balances[acc.id].totalConsumed,
        };
    });

    const columns = [
        { field: "id", headerName: "ID", hide: true },
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
                columns={columns}
                disableSelectionOnClick
                autoHeight
                components={{
                    Toolbar: GridToolbar,
                }}
            />
        </div>
    );
}
