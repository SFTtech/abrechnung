import * as React from "react";
import { DateTime } from "luxon";
import { useTranslation } from "react-i18next";

export const useFormatDatetime = () => {
    const { i18n } = useTranslation();

    return React.useCallback(
        (datetime: DateTime | string, mode: "full" | "date" = "full") => {
            let d = datetime;
            if (typeof datetime === "string") {
                d = DateTime.fromISO(datetime);
            }

            return d.toLocaleString(mode === "full" ? DateTime.DATETIME_FULL : DateTime.DATE_FULL, {
                locale: i18n.language,
            });
        },
        [i18n]
    );
};
