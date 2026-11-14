import { useFormatCurrency, useFormatDatetime } from "@/hooks";
import { getAccountLink } from "@/utils";
import { GroupLog } from "@/core/generated/api";
import {
    Add,
    AdminPanelSettings,
    Delete,
    Edit,
    Groups,
    Link as LinkIcon,
    LinkOff,
    PersonAdd,
    PersonRemove,
    Settings,
    SvgIconComponent,
} from "@mui/icons-material";
import { Divider, ListItem, ListItemAvatar, ListItemText, Link as MuiLink, Tooltip, Typography } from "@mui/material";
import { DateTime } from "luxon";
import * as React from "react";
import { Trans } from "react-i18next";
import { Link as RouterLink } from "react-router";
import { getLogCategory, LogCategory } from "./activityLog";

const typeIcons: Record<string, SvgIconComponent> = {
    "group-created": Groups,
    "group-updated": Settings,
    "invite-created": LinkIcon,
    "invite-deleted": LinkOff,
    "member-joined": PersonAdd,
    "member-left": PersonRemove,
    "owner-granted": AdminPanelSettings,
    "owner-revoked": AdminPanelSettings,
    "write-granted": Edit,
    "write-revoked": Edit,
    "transaction-created": Add,
    "transaction-updated": Edit,
    "transaction-deleted": Delete,
    "account-created": Add,
    "account-updated": Edit,
    "account-deleted": Delete,
    "event-created": Add,
    "event-updated": Edit,
    "event-deleted": Delete,
};

const categoryColors: Record<LogCategory, "primary" | "secondary" | "success" | "info" | "warning"> = {
    transactions: "primary",
    accounts: "success",
    events: "warning",
    members: "secondary",
    group: "info",
};

type Target = { name: string; to?: string };

type EntryKey =
    | "group-created"
    | "group-updated"
    | "invite-created"
    | "invite-deleted"
    | "member-joined"
    | "member-left"
    | "owner-granted"
    | "owner-revoked"
    | "write-granted"
    | "write-revoked"
    | "transaction-created"
    | "transaction-updated"
    | "transaction-deleted"
    | "account-created"
    | "account-updated"
    | "account-deleted"
    | "event-created"
    | "event-updated"
    | "event-deleted"
    | "legacy";

type Description = {
    // translation key below groups.log.entries
    key: EntryKey;
    target?: Target;
    // short additional information shown next to the time, e.g. the value of a transaction
    details?: string;
    // text of entries from before the log was structured, shown below the sentence
    legacyMessage?: string;
};

type Props = {
    groupId: number;
    entry: GroupLog;
};

const TargetLink: React.FC<{ to: string; children?: React.ReactNode }> = ({ to, children }) => (
    <MuiLink component={RouterLink} to={to} sx={{ fontWeight: "bold" }}>
        {children}
    </MuiLink>
);

const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);

export const ActivityEntry: React.FC<Props> = ({ groupId, entry }) => {
    const formatCurrency = useFormatCurrency();
    const formatDatetime = useFormatDatetime();

    const description = React.useMemo((): Description => {
        const name = asString(entry.data["name"]);
        switch (entry.type) {
            case "transaction-created":
            case "transaction-updated":
            case "transaction-deleted": {
                const value = entry.data["value"];
                const currency = asString(entry.data["currency_identifier"]);
                return {
                    key: entry.type,
                    target:
                        name !== undefined
                            ? {
                                  name,
                                  to:
                                      entry.transaction_id != null && !entry.transaction_deleted
                                          ? `/groups/${groupId}/transactions/${entry.transaction_id}`
                                          : undefined,
                              }
                            : undefined,
                    details:
                        typeof value === "number" && currency !== undefined
                            ? formatCurrency(value, currency)
                            : undefined,
                };
            }
            case "account-created":
            case "account-updated":
            case "account-deleted":
            case "event-created":
            case "event-updated":
            case "event-deleted": {
                const isEvent = entry.type.startsWith("event-");
                return {
                    key: entry.type,
                    target:
                        name !== undefined
                            ? {
                                  name,
                                  to:
                                      entry.account_id != null && !entry.account_deleted
                                          ? getAccountLink(groupId, isEvent ? "clearing" : "personal", entry.account_id)
                                          : undefined,
                              }
                            : undefined,
                };
            }
            case "group-created":
            case "group-updated":
            case "invite-created":
            case "invite-deleted":
            case "member-joined":
            case "member-left":
            case "owner-granted":
            case "owner-revoked":
            case "write-granted":
            case "write-revoked":
                return { key: entry.type };
            default:
                // entries from before the log was structured or unknown types
                return { key: "legacy", legacyMessage: entry.message !== "" ? entry.message : entry.type };
        }
    }, [entry, groupId, formatCurrency]);

    const category = getLogCategory(entry.type);
    const Icon = typeIcons[entry.type] ?? Settings;
    const loggedAt = DateTime.fromISO(entry.logged_at);
    // translated sentences are <actor>...</actor> ... <affected>...</affected> ... <target>...</target>
    const components = {
        actor: <strong />,
        affected: <strong />,
        target: description.target?.to !== undefined ? <TargetLink to={description.target.to} /> : <strong />,
    };

    return (
        <>
            <ListItem sx={{ py: 0.75 }}>
                <ListItemAvatar sx={{ minWidth: { xs: "40px", md: "56px" } }}>
                    <Icon color={category ? categoryColors[category] : "action"} />
                </ListItemAvatar>
                <ListItemText
                    slotProps={{ primary: { component: "div", variant: "body2" }, secondary: { component: "div" } }}
                    primary={
                        <Trans
                            i18nKey={`groups.log.entries.${description.key}`}
                            values={{
                                actor: entry.username,
                                affected: entry.affected_username ?? "",
                                target: description.target?.name ?? "",
                            }}
                            components={components}
                        />
                    }
                    secondary={
                        <>
                            <Tooltip title={formatDatetime(entry.logged_at, "full")} placement="bottom-start">
                                <span>{loggedAt.toLocaleString(DateTime.TIME_SIMPLE)}</span>
                            </Tooltip>
                            {description.details !== undefined && (
                                <>
                                    &nbsp;&middot;&nbsp;
                                    <Typography component="span" variant="body2" sx={{ color: "text.primary" }}>
                                        {description.details}
                                    </Typography>
                                </>
                            )}
                            {description.legacyMessage !== undefined && (
                                <>&nbsp;&middot;&nbsp;{description.legacyMessage}</>
                            )}
                        </>
                    }
                    sx={{ my: 0 }}
                />
            </ListItem>
            <Divider sx={{ display: { lg: "none" } }} component="li" />
        </>
    );
};
