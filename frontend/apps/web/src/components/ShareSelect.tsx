import { useIsSmallScreen } from "@/hooks";
import { NumericInput } from "@abrechnung/components";
import { getAccountSortFunc } from "@abrechnung/core";
import { useGroupAccounts } from "@abrechnung/redux";
import { Account, TransactionShare } from "@abrechnung/types";
import { Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import {
    Box,
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TextField,
    Typography,
    useTheme,
} from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router";
import { getAccountLink } from "../utils";
import { getAccountIcon } from "./style/AbrechnungIcons";

interface RowProps {
    account: Account;
    showAdvanced: boolean;
    editable: boolean;
    onChange: (accountId: number, newShareValue: number) => void;
    renderAdditionalShareInfo?: React.FC<{ account: Account }> | undefined;
    shareValue?: number | undefined;
}

const ShareSelectRow: React.FC<RowProps> = ({
    account,
    editable,
    showAdvanced,
    shareValue,
    onChange,
    renderAdditionalShareInfo,
}) => {
    const theme = useTheme();
    const handleChange = (newValue: number) => {
        onChange(account.id, newValue);
    };

    const handleToggleShare = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            onChange(account.id, 1);
        } else {
            onChange(account.id, 0);
        }
    };

    return (
        <TableRow hover>
            <TableCell>
                <Link
                    style={{
                        color: theme.palette.text.primary,
                        textDecoration: "none",
                        display: "block",
                        height: "100%",
                        width: "100%",
                    }}
                    to={getAccountLink(account.group_id, account.type, account.id)}
                >
                    <Grid container direction="row" alignItems="center">
                        <Grid item>{getAccountIcon(account.type)}</Grid>
                        <Grid item sx={{ ml: 1, display: "flex", flexDirection: "column" }}>
                            <Typography variant="body2" component="span">
                                {account.name}
                            </Typography>
                            {account.type === "clearing" && account.date_info != null && (
                                <Typography variant="caption" component="span">
                                    {account.date_info}
                                </Typography>
                            )}
                        </Grid>
                    </Grid>
                </Link>
            </TableCell>
            <TableCell width="100px">
                {showAdvanced ? (
                    <NumericInput value={shareValue ?? 0} onChange={handleChange} disabled={!editable} />
                ) : (
                    <Checkbox checked={(shareValue ?? 0) > 0} disabled={!editable} onChange={handleToggleShare} />
                )}
            </TableCell>
            {renderAdditionalShareInfo ? renderAdditionalShareInfo({ account }) : null}
        </TableRow>
    );
};

interface ShareSelectProps {
    groupId: number;
    label: string;
    value: TransactionShare;
    onChange?: (newShares: TransactionShare) => void;
    error?: boolean | undefined;
    helperText?: React.ReactNode | undefined;
    shouldDisplayAccount?: (accountId: number) => boolean | undefined;
    additionalShareInfoHeader?: React.ReactNode | undefined;
    renderAdditionalShareInfo?: React.FC<{ account: Account }> | undefined;
    excludeAccounts?: number[] | undefined;
    editable?: boolean | undefined;
}

export const ShareSelect: React.FC<ShareSelectProps> = ({
    groupId,
    label,
    value,
    onChange,
    shouldDisplayAccount,
    additionalShareInfoHeader,
    renderAdditionalShareInfo,
    excludeAccounts,
    error,
    helperText,
    editable = false,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isSmallScreen = useIsSmallScreen();

    const [showEvents, setShowEvents] = React.useState(false);
    const [showAdvanced, setShowAdvanced] = React.useState(false);
    const [searchValue, setSearchValue] = React.useState("");

    const unfilteredAccounts = useGroupAccounts(groupId);
    const accounts = React.useMemo(() => {
        const sortFn = getAccountSortFunc("name");
        return unfilteredAccounts
            .filter((a) => {
                const isAccountShown = (accountId: number) => {
                    if (value[accountId] !== undefined) {
                        return true;
                    }

                    if (editable) {
                        return !(!showEvents && a.type === "clearing");
                    }
                    if (shouldDisplayAccount) {
                        return shouldDisplayAccount(accountId);
                    }
                    return false;
                };
                if (excludeAccounts && excludeAccounts.includes(a.id)) {
                    return false;
                }
                if (!isAccountShown(a.id)) {
                    return false;
                }
                if (searchValue && searchValue !== "") {
                    return (
                        a.name.toLowerCase().includes(searchValue.toLowerCase()) ||
                        a.description.toLowerCase().includes(searchValue.toLowerCase()) ||
                        (a.type === "clearing" && a.date_info && a.date_info.includes(searchValue.toLowerCase()))
                    );
                }
                return true;
            })
            .sort(sortFn);
    }, [value, showEvents, editable, searchValue, unfilteredAccounts, excludeAccounts, shouldDisplayAccount]);

    React.useEffect(() => {
        if (Object.values(value).reduce((showAdvanced, value) => showAdvanced || value !== 1, false)) {
            setShowAdvanced(true);
        }
    }, [value, setShowAdvanced]);

    const nSelectedPeople = accounts.reduce((nAccs: number, acc: Account) => {
        if (acc.type !== "personal") {
            return nAccs;
        }
        if ((shouldDisplayAccount && shouldDisplayAccount(acc.id)) || value[acc.id] > 0) {
            return nAccs + 1;
        }
        return nAccs;
    }, 0);
    const nSelectedEvents = accounts.reduce((nAccs: number, acc: Account) => {
        if (acc.type !== "clearing") {
            return nAccs;
        }
        if ((shouldDisplayAccount && shouldDisplayAccount(acc.id)) || value[acc.id] > 0) {
            return nAccs + 1;
        }
        return nAccs;
    }, 0);
    const showSearch = !isSmallScreen && unfilteredAccounts.length > 5;

    const handleAccountShareChange = (accountId: number, shareValue: number) => {
        const newValue = { ...value };
        if (shareValue === 0) {
            delete newValue[accountId];
            return onChange?.(newValue);
        } else {
            newValue[accountId] = shareValue;
            return onChange?.(newValue);
        }
    };

    return (
        <div>
            <Grid container direction="row" justifyContent="space-between">
                <Box sx={{ display: "flex", flexDirection: "row", alignItems: "center", gap: "0.5em", marginY: 1 }}>
                    <Typography variant="subtitle1">{label}</Typography>
                    {nSelectedPeople > 0 && (
                        <Chip
                            label={t("shareSelect.selectedPeople", "", { count: nSelectedPeople })}
                            size="small"
                            color="primary"
                        />
                    )}
                    {nSelectedEvents > 0 && (
                        <Chip
                            label={t("shareSelect.selectedEvent", "", { count: nSelectedEvents })}
                            size="small"
                            color="primary"
                        />
                    )}
                </Box>
                {editable && (
                    <Box>
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="show-events"
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                        setShowEvents(event.target.checked)
                                    }
                                />
                            }
                            checked={showEvents}
                            label={t("shareSelect.showEvents")}
                        />
                        <FormControlLabel
                            control={
                                <Checkbox
                                    name="show-advanced"
                                    onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                        setShowAdvanced(event.target.checked)
                                    }
                                />
                            }
                            checked={showAdvanced}
                            label={t("common.advanced")}
                        />
                    </Box>
                )}
            </Grid>
            <Divider variant="middle" sx={{ marginLeft: 0 }} />
            <TableContainer
                sx={{
                    maxHeight: { md: 400 },
                    borderColor: error ? theme.palette.error.main : undefined,
                    borderWidth: error ? 2 : undefined,
                    borderStyle: error ? "solid" : undefined,
                }}
            >
                {helperText && (
                    <Typography variant="body2" color={error ? theme.palette.error.main : undefined} sx={{ margin: 1 }}>
                        {helperText}
                    </Typography>
                )}
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>
                                {!showSearch ? (
                                    t("shareSelect.accountSlashEvent")
                                ) : (
                                    <TextField
                                        placeholder={t("common.search")}
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
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <IconButton
                                                        aria-label="clear search input"
                                                        onClick={(e) => setSearchValue("")}
                                                        edge="end"
                                                    >
                                                        <ClearIcon />
                                                    </IconButton>
                                                </InputAdornment>
                                            ),
                                        }}
                                    />
                                )}
                            </TableCell>
                            <TableCell width="100px">{t("common.shares")}</TableCell>
                            {additionalShareInfoHeader ?? null}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts.map((account) => (
                            <ShareSelectRow
                                key={account.id}
                                editable={editable}
                                account={account}
                                onChange={handleAccountShareChange}
                                shareValue={value[account.id]}
                                showAdvanced={showAdvanced}
                                renderAdditionalShareInfo={renderAdditionalShareInfo}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};
