import "i18next";
import type { resources, defaultNS } from "@abrechnung/translations";

declare module "i18next" {
    interface CustomTypeOptions {
        defaultNS: typeof defaultNS;
        nsSeparator: "";
        resources: { "": (typeof resources)["en"]["translations"] };
        // the following should be working but has apparently been broken in i18next 23.x
        // resources: (typeof resources)["en"];
    }
}
