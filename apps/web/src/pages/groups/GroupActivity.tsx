import { Loading } from "@abrechnung/components";
import { useGroup } from "@abrechnung/redux";
import { MobilePaper } from "@/components/style";
import { GroupLog, useLazyListLogQuery, useListLogQuery } from "@/core/generated/api";
import { useTitle } from "@/core/utils";
import { useFormatDatetime } from "@/hooks";
import { FilterAltOff } from "@mui/icons-material";
import { Alert, Button, Chip, List, ListSubheader, Stack, Typography } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { ActivityEntry } from "./activity/ActivityEntry";
import {
    getRelativeDay,
    getTypesForCategories,
    groupEntriesByDay,
    LOG_CATEGORIES,
    LogCategory,
} from "./activity/activityLog";

const PAGE_SIZE = 50;

interface Props {
    groupId: number;
}

export const GroupActivity: React.FC<Props> = ({ groupId }) => {
    const { t } = useTranslation();
    const group = useGroup(groupId);
    const formatDatetime = useFormatDatetime();
    const [categories, setCategories] = React.useState<LogCategory[]>([]);
    // pages loaded via "load more", the first page is fetched declaratively
    const [olderPages, setOlderPages] = React.useState<GroupLog[][]>([]);
    // used to ignore responses of requests that were superseded by a filter change
    const filterGeneration = React.useRef(0);
    const types = getTypesForCategories(categories);

    const {
        data: firstPage,
        isError: isFirstPageError,
        refetch,
    } = useListLogQuery({ groupId, limit: PAGE_SIZE, types });
    const [fetchOlder, { isFetching: isFetchingOlder, isError: isOlderPageError }] = useLazyListLogQuery();

    useTitle(t("groups.log.tabTitle", { groupName: group?.name }));

    const entries = React.useMemo(() => {
        if (firstPage === undefined) {
            return undefined;
        }
        const seen = new Set<number>();
        return [...firstPage, ...olderPages.flat()].filter((entry) => {
            if (seen.has(entry.id)) {
                return false;
            }
            seen.add(entry.id);
            return true;
        });
    }, [firstPage, olderPages]);

    const lastPage = olderPages.at(-1) ?? firstPage;
    const hasMore = lastPage?.length === PAGE_SIZE;

    const loadMore = async () => {
        const beforeId = entries?.at(-1)?.id;
        if (beforeId === undefined) {
            return;
        }
        const generation = filterGeneration.current;
        try {
            const page = await fetchOlder({ groupId, beforeId, limit: PAGE_SIZE, types }).unwrap();
            if (generation === filterGeneration.current) {
                setOlderPages((prev) => [...prev, page]);
            }
        } catch {
            // surfaced via isOlderPageError
        }
    };

    const selectCategories = (selected: LogCategory[]) => {
        filterGeneration.current++;
        setOlderPages([]);
        setCategories(selected);
    };

    const toggleCategory = (category: LogCategory) => {
        selectCategories(
            categories.includes(category) ? categories.filter((c) => c !== category) : [...categories, category]
        );
    };

    const dayGroups = React.useMemo(() => groupEntriesByDay(entries ?? []), [entries]);

    const formatDay = (day: ReturnType<typeof groupEntriesByDay>[number]["day"]) => {
        switch (getRelativeDay(day)) {
            case "today":
                return t("groups.log.today");
            case "yesterday":
                return t("groups.log.yesterday");
            default:
                return formatDatetime(day, "date");
        }
    };

    return (
        <MobilePaper>
            <Typography component="h3" variant="h5">
                {t("groups.log.header")}
            </Typography>
            <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap", mt: 2 }}>
                {LOG_CATEGORIES.map((category) => (
                    <Chip
                        key={category}
                        label={t(`groups.log.categories.${category}`)}
                        color={categories.includes(category) ? "primary" : "default"}
                        variant={categories.includes(category) ? "filled" : "outlined"}
                        onClick={() => toggleCategory(category)}
                    />
                ))}
                {categories.length > 0 && (
                    <Button size="small" startIcon={<FilterAltOff />} onClick={() => selectCategories([])}>
                        {t("groups.log.resetFilter")}
                    </Button>
                )}
            </Stack>
            {(isFirstPageError || isOlderPageError) && (
                <Alert
                    severity="error"
                    sx={{ mt: 2 }}
                    action={
                        <Button
                            color="inherit"
                            size="small"
                            onClick={() => void (isFirstPageError ? refetch() : loadMore())}
                        >
                            {t("groups.log.retry")}
                        </Button>
                    }
                >
                    {t("groups.log.loadingFailed")}
                </Alert>
            )}
            {entries === undefined && !isFirstPageError ? (
                <Loading />
            ) : entries?.length === 0 ? (
                <Typography color="text.secondary" sx={{ py: 4, textAlign: "center" }}>
                    {t("groups.log.empty")}
                </Typography>
            ) : (
                <List disablePadding>
                    {dayGroups.map((dayGroup) => (
                        <li key={dayGroup.day.toISODate()}>
                            <List disablePadding subheader={<li />}>
                                <ListSubheader disableGutters sx={{ px: { xs: 0.5, sm: 2 } }}>
                                    {formatDay(dayGroup.day)}
                                </ListSubheader>
                                {dayGroup.entries.map((entry) => (
                                    <ActivityEntry key={entry.id} groupId={groupId} entry={entry} />
                                ))}
                            </List>
                        </li>
                    ))}
                </List>
            )}
            {hasMore && (
                <Stack sx={{ mt: 2, alignItems: "center" }}>
                    <Button disabled={isFetchingOlder} onClick={() => void loadMore()}>
                        {t("groups.log.loadMore")}
                    </Button>
                </Stack>
            )}
        </MobilePaper>
    );
};
