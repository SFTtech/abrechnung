import { useFormatCurrency, useIsSmallScreen } from "@/hooks";
import { NumericInput } from "@abrechnung/components";
import { getAccountSortFunc, getCurrencySymbolForIdentifier } from "@abrechnung/core";
import { useGroupAccounts } from "@abrechnung/redux";
import { Account, FrontendSplitMode, TransactionShare } from "@abrechnung/types";
import { Clear as ClearIcon, Search as SearchIcon } from "@mui/icons-material";
import {
    Checkbox,
    Chip,
    Divider,
    FormControlLabel,
    Grid,
    IconButton,
    InputAdornment,
    MenuItem,
    Stack,
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
import { SplitMode } from "@abrechnung/api";

interface RowProps {
    account: Account;
    splitMode: FrontendSplitMode;
    editable: boolean;
    currencyIdentifier?: string;
    onChange: (accountId: number, newShareValue: number) => void;
    AdditionalShareInfo?: React.FC<{ account: Account }> | undefined;
    shareValue?: number | undefined;
}

const ShareSelectRow: React.FC<RowProps> = ({
    account,
    editable,
    splitMode,
    shareValue,
    currencyIdentifier,
    onChange,
    AdditionalShareInfo,
}) => {
    const { i18n } = useTranslation();
    const theme = useTheme();
    const formatCurrency = useFormatCurrency();
    const handleChange = (newValue: number) => {
        if (splitMode === "percent") {
            newValue = newValue / 100;
        }
        onChange(account.id, newValue);
    };

    const handleToggleShare = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            onChange(account.id, 1);
        } else {
            onChange(account.id, 0);
        }
    };

    let inputAdornment;
    let value;
    switch (splitMode) {
        case "evenly":
            value = shareValue ?? 0;
            break;
        case "shares":
            value = shareValue ?? 0;
            break;
        case "percent":
            value = (shareValue ?? 0) * 100;
            inputAdornment = <InputAdornment position="end">%</InputAdornment>;
            break;
        case "absolute":
            value = shareValue ?? 0;
            if (currencyIdentifier) {
                inputAdornment = (
                    <InputAdornment position="end">{getCurrencySymbolForIdentifier(currencyIdentifier)}</InputAdornment>
                );
            }
            break;
    }

    let valueDisplay;
    if (splitMode === "evenly") {
        valueDisplay = <Checkbox checked={value > 0} disabled={!editable} onChange={handleToggleShare} />;
    } else {
        if (editable) {
            valueDisplay = (
                <NumericInput
                    value={value}
                    isCurrency={splitMode === "absolute"}
                    onChange={handleChange}
                    disabled={!editable}
                    slotProps={{ input: { endAdornment: inputAdornment } }}
                />
            );
        } else {
            if (splitMode === "percent") {
                const formatDef = new Intl.NumberFormat(i18n.language, {
                    style: "decimal",
                    maximumFractionDigits: 2,
                });

                valueDisplay = `${formatDef.format(value)}%`;
            } else if (splitMode === "absolute") {
                valueDisplay = formatCurrency(value, currencyIdentifier);
            } else {
                valueDisplay = value.toString();
            }
        }
    }

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
                        <Grid>{getAccountIcon(account.type)}</Grid>
                        <Grid display="flex" flexDirection="column" sx={{ ml: 1 }}>
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
            <TableCell width="100px">{valueDisplay}</TableCell>
            {AdditionalShareInfo ? <AdditionalShareInfo account={account} /> : null}
        </TableRow>
    );
};

interface ShareSelectProps {
    groupId: number;
    label: string;
    value: TransactionShare;
    onChange?: (newShares: TransactionShare) => void;
    splitMode: SplitMode;
    onChangeSplitMode?: (newMode: FrontendSplitMode) => void;
    error?: boolean | undefined;
    helperText?: React.ReactNode | undefined;
    shouldDisplayAccount?: (accountId: number) => boolean | undefined;
    additionalShareInfoHeader?: React.ReactNode | undefined;
    AdditionalShareInfo?: React.FC<{ account: Account }> | undefined;
    excludeAccounts?: number[] | undefined;
    currencyIdentifier?: string;
    editable?: boolean | undefined;
}

export const ShareSelect: React.FC<ShareSelectProps> = ({
    groupId,
    label,
    value,
    onChange,
    splitMode,
    onChangeSplitMode,
    shouldDisplayAccount,
    additionalShareInfoHeader,
    AdditionalShareInfo,
    excludeAccounts,
    currencyIdentifier,
    error,
    helperText,
    editable = false,
}) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const isSmallScreen = useIsSmallScreen();

    const [showEvents, setShowEvents] = React.useState(false);
    const [frontendSplitMode, setFrontendSplitMode] = React.useState<FrontendSplitMode>(splitMode);
    const [searchValue, setSearchValue] = React.useState("");

    const handleSplitModeChange = (newMode: FrontendSplitMode) => {
        setFrontendSplitMode(newMode);
        onChangeSplitMode?.(newMode);
    };

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
        // set displayed split mode to evenly if we have a "shares" split with non-even shares
        if (
            splitMode === "shares" &&
            Object.values(value).reduce((onlyDefaultShares, value) => onlyDefaultShares && value === 1, true)
        ) {
            setFrontendSplitMode("evenly");
        }
    }, [splitMode, value, setFrontendSplitMode]);

    const nSelectedPeople = React.useMemo(
        () =>
            accounts.reduce((nAccs: number, acc: Account) => {
                if (acc.type !== "personal") {
                    return nAccs;
                }
                if ((shouldDisplayAccount && shouldDisplayAccount(acc.id)) || value[acc.id] > 0) {
                    return nAccs + 1;
                }
                return nAccs;
            }, 0),
        [accounts, value, shouldDisplayAccount]
    );

    const nSelectedEvents = React.useMemo(
        () =>
            accounts.reduce((nAccs: number, acc: Account) => {
                if (acc.type !== "clearing") {
                    return nAccs;
                }
                if ((shouldDisplayAccount && shouldDisplayAccount(acc.id)) || value[acc.id] > 0) {
                    return nAccs + 1;
                }
                return nAccs;
            }, 0),
        [accounts, value, shouldDisplayAccount]
    );

    const nSelected = React.useMemo(() => {
        return Object.values(value).reduce((nSelected, val) => nSelected + (val > 0 ? 1 : 0), 0);
    }, [value]);
    const isAllSelected = nSelected === accounts.length;
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

    const handleSelectAll = () => {
        if (isAllSelected) {
            onChange?.({});
        } else {
            const newVal: TransactionShare = accounts.reduce<TransactionShare>((shares, account) => {
                shares[account.id] = 1;
                return shares;
            }, {});
            onChange?.(newVal);
        }
    };

    return (
        <div>
            <Grid container direction={isSmallScreen ? "column" : "row"} justifyContent="space-between">
                <Stack direction="row" spacing={1} sx={{ alignItems: "center", marginY: 1 }}>
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
                </Stack>
                {editable && (
                    <Stack direction="row" spacing={2} sx={{ paddingY: 1 }}>
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
                        <TextField
                            variant="standard"
                            value={frontendSplitMode}
                            sx={{ minWidth: 200 }}
                            onChange={(e) => handleSplitModeChange(e.target.value as FrontendSplitMode)}
                            label={t("shareSelect.splitMode")}
                            select
                        >
                            <MenuItem value="evenly">{t("shareSelect.split_evenly")}</MenuItem>
                            <MenuItem value="shares">{t("shareSelect.split_shares")}</MenuItem>
                            <MenuItem value="percent">{t("shareSelect.split_percent")}</MenuItem>
                            <MenuItem value="absolute">{t("shareSelect.split_absolute")}</MenuItem>
                        </TextField>
                    </Stack>
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
                                        slotProps={{
                                            input: {
                                                startAdornment: (
                                                    <InputAdornment position="start">
                                                        <SearchIcon />
                                                    </InputAdornment>
                                                ),
                                                endAdornment: (
                                                    <InputAdornment position="end">
                                                        <IconButton
                                                            aria-label="clear search input"
                                                            onClick={() => setSearchValue("")}
                                                            edge="end"
                                                        >
                                                            <ClearIcon />
                                                        </IconButton>
                                                    </InputAdornment>
                                                ),
                                            },
                                        }}
                                    />
                                )}
                            </TableCell>
                            <TableCell width="100px">
                                {editable ? (
                                    <FormControlLabel
                                        control={<Checkbox onChange={handleSelectAll} />}
                                        checked={isAllSelected}
                                        label={t("common.shares")}
                                    />
                                ) : (
                                    t("common.shares")
                                )}
                            </TableCell>
                            {additionalShareInfoHeader ?? null}
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {accounts.map((account) => (
                            <ShareSelectRow
                                key={account.id}
                                editable={editable}
                                account={account}
                                currencyIdentifier={currencyIdentifier}
                                onChange={handleAccountShareChange}
                                shareValue={value[account.id]}
                                splitMode={frontendSplitMode}
                                AdditionalShareInfo={AdditionalShareInfo}
                            />
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </div>
    );
};
