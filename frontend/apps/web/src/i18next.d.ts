import "i18next";
import type { resources, defaultNS } from "@abrechnung/translations";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: typeof defaultNS;
        nsSeparator: "";
        resources: { "": (typeof resources)["en"]["translations"] };
    }
}
