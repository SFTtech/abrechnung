import * as React from "react";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

type FormatMode = "full" | "date" | "date-short";

const modes = {
    full: DateTime.DATETIME_FULL,
    date: DateTime.DATE_FULL,
    "date-short": DateTime.DATE_SHORT,
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export const useFormatDatetime = () => {
    const { i18n } = useTranslation();

    return React.useCallback(
        (datetime: DateTime | string, mode: FormatMode = "full") => {
            let d = datetime;
            if (typeof datetime === "string") {
                d = DateTime.fromISO(datetime);
            }

            return d.toLocaleString(modes[mode], {
                locale: i18n.language,
            });
        },
        [i18n]
    );
};
