import React from "react";
import { useRecoilValue } from "recoil";
import { DataGrid, GridToolbar } from "@mui/x-data-grid";
import { personalAccountsSeenByUser } from "../../state/accounts";
import { accountBalances } from "../../state/transactions";
import { renderCurrency } from "../style/datagrid/renderCurrency";
import { Group } from "@abrechnung/types";

interface Props {
    group: Group;
}

export const BalanceTable: React.FC<Props> = ({ group }) => {
    const personalAccounts = useRecoilValue(personalAccountsSeenByUser(group.id));
    const balances = useRecoilValue(accountBalances(group.id));

    const tableData = personalAccounts.map((acc) => {
        return {
            ...acc,
            balance: balances.get(acc.id)?.balance,
            totalPaid: balances.get(acc.id)?.totalPaid,
            totalConsumed: balances.get(acc.id)?.totalConsumed,
        };
    });

    const columns = [
        { field: "id", headerName: "ID", hide: true },
        { field: "name", headerName: "Name", width: 150 },
        { field: "description", headerName: "Description", width: 200 },
        {
            field: "totalConsumed",
            headerName: "Received / Consumed",
            renderCell: renderCurrency(group.currencySymbol, "red"),
        },
        {
            field: "totalPaid",
            headerName: "Paid",
            renderCell: renderCurrency(group.currencySymbol, "green"),
        },
        {
            field: "balance",
            headerName: "Balance",
            renderCell: renderCurrency(group.currencySymbol),
        },
    ];

    return (
        <div style={{ width: "100%" }}>
            <DataGrid
                sx={{ border: 0 }}
                rows={tableData}
                columns={columns as any} // TODO: fixme and figure out proper typing
                disableSelectionOnClick
                autoHeight
                components={{
                    Toolbar: GridToolbar,
                }}
            />
        </div>
    );
};

export default BalanceTable;
