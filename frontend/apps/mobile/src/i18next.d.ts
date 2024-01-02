import "i18next";
import type { resources, defaultNS } from "@abrechnung/translations";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: typeof defaultNS;
        resources: (typeof resources)["en"];
    }
}
