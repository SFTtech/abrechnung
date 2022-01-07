import {
    Checkbox,
    FormControlLabel,
    Grid,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography
} from "@mui/material";
import {ShareInput} from "../ShareInput";
import {useState} from "react";
import {useRecoilValue} from "recoil";
import {accountsSeenByUser} from "../../recoil/accounts";
import {CompareArrows, Person} from "@mui/icons-material";

export default function ClearingSharesFormElement({group, clearingShares, setClearingShares, accountID = undefined}) {
    const accounts = useRecoilValue(accountsSeenByUser(group.id));
    const [showAdvanced, setShowAdvanced] = useState();

    return (
        <>
            <Grid container direction="row" justifyContent="space-between">
                <Typography variant="subtitle1">
                    For whom
                </Typography>
                <FormControlLabel
                    control={<Checkbox name={`show-advanced`}/>}
                    checked={showAdvanced}
                    onChange={event => setShowAdvanced(event.target.checked)}
                    label="Advanced"/>
            </Grid>
            <TableContainer>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Account</TableCell>
                            <TableCell width="100px">Shares</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts.map(account => (accountID === undefined || account.id !== accountID) && (
                            <TableRow hover key={account.id}>
                                <TableCell>{account.type === "personal" ? (<Person/>) :
                                    <CompareArrows/>}{account.name}</TableCell>
                                <TableCell
                                    width="100px"
                                >
                                    {showAdvanced ? (
                                        <ShareInput
                                            onChange={(value) => setClearingShares({
                                                ...(clearingShares !== undefined ? clearingShares : {}),
                                                [account.id]: value
                                            })}
                                            value={clearingShares && clearingShares.hasOwnProperty(account.id) ? clearingShares[account.id] : 0.0}
                                        />
                                    ) : (
                                        <Checkbox
                                            name={`${account.name}-checked`}
                                            checked={clearingShares && clearingShares.hasOwnProperty(account.id) && clearingShares[account.id] !== 0}
                                            onChange={event => setClearingShares({
                                                ...(clearingShares !== undefined ? clearingShares : {}),
                                                [account.id]: event.target.checked ? 1.0 : 0.0
                                            })}
                                        />
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </>
    )
}