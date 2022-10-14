import {
    Checkbox,
    FormControlLabel,
    Grid,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
} from "@mui/material";
import { ShareInput } from "../ShareInput";
import React, { useEffect, useState } from "react";
import { useRecoilValue } from "recoil";
import { accountsSeenByUser, ClearingShares } from "../../state/accounts";
import { CompareArrows, Person, Search as SearchIcon } from "@mui/icons-material";
import { Group } from "../../state/groups";

interface Props {
    group: Group;
    clearingShares: ClearingShares;
    setClearingShares: (shares: ClearingShares) => void;
    accountID?: number;
}

export const ClearingSharesFormElement: React.FC<Props> = ({
    group,
    clearingShares,
    setClearingShares,
    accountID = undefined,
}) => {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [searchValue, setSearchValue] = useState("");
    const [filteredAccounts, setFilteredAccounts] = useState([]);

    useEffect(() => {
        if (searchValue != null && searchValue !== "") {
            setFilteredAccounts(
                accounts.filter((acc) => {
                    return acc.name.toLowerCase().includes(searchValue.toLowerCase());
                })
            );
        } else {
            setFilteredAccounts(accounts);
        }
    }, [searchValue, accounts]);

    return (
        <>
            <Grid container direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">Allocation to</Typography>
                <FormControlLabel
                    control={<Checkbox name={`show-advanced`} />}
                    checked={showAdvanced}
                    onChange={(event: React.ChangeEvent<HTMLInputElement>) => setShowAdvanced(event.target.checked)}
                    label="Advanced"
                />
            </Grid>
            <TableContainer sx={{ maxHeight: 400 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                <TextField
                                    placeholder="Search ..."
                                    margin="none"
                                    size="small"
                                    value={searchValue}
                                    onChange={(e) => setSearchValue(e.target.value)}
                                    variant="standard"
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </TableCell>
                            <TableCell width="100px">Shares</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filteredAccounts.map(
                            (account) =>
                                (accountID === undefined || account.id !== accountID) && (
                                    <TableRow hover key={account.id}>
                                        <TableCell>
                                            <Grid container direction="row" alignItems="center">
                                                <Grid item>
                                                    {account.type === "personal" ? <Person /> : <CompareArrows />}
                                                </Grid>
                                                <Grid item sx={{ ml: 1 }}>
                                                    <Typography variant="body2" component="span">
                                                        {account.name}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                        </TableCell>
                                        <TableCell width="100px">
                                            {showAdvanced ? (
                                                <ShareInput
                                                    onChange={(value) =>
                                                        setClearingShares({
                                                            ...(clearingShares !== undefined ? clearingShares : {}),
                                                            [account.id]: value,
                                                        })
                                                    }
                                                    value={
                                                        clearingShares && clearingShares.hasOwnProperty(account.id)
                                                            ? clearingShares[account.id]
                                                            : 0.0
                                                    }
                                                />
                                            ) : (
                                                <Checkbox
                                                    name={`${account.name}-checked`}
                                                    checked={
                                                        clearingShares &&
                                                        clearingShares.hasOwnProperty(account.id) &&
                                                        clearingShares[account.id] !== 0
                                                    }
                                                    onChange={(event) =>
                                                        setClearingShares({
                                                            ...(clearingShares !== undefined ? clearingShares : {}),
                                                            [account.id]: event.target.checked ? 1.0 : 0.0,
                                                        })
                                                    }
                                                />
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    );
};

export default ClearingSharesFormElement;
