import * as React from "react";
import { z } from "zod";
import { environment } from "@/environments/environment";
import { AlertColor } from "@mui/material/Alert/Alert";
import { Loading } from "@/components/style";
import { Alert, AlertTitle } from "@mui/material";

const configSchema = z.object({
    imprintURL: z.string().optional().nullable(),
    sourceCodeURL: z.string().optional(),
    issueTrackerURL: z.string().optional().nullable(),
    messages: z
        .array(
            z.object({
                type: z.union([z.literal("info"), z.literal("error"), z.literal("warning"), z.literal("success")]),
                title: z.string().nullable().default(null),
                body: z.string(),
            })
        )
        .optional(),
    error: z.string().optional(),
});

export interface StatusMessage {
    type: AlertColor;
    title: string | null;
    body: string;
}

export type Config = z.infer<typeof configSchema>;

const ConfigContext = React.createContext<Config>(null as unknown as Config);

export type ConfigProviderProps = {
    children: React.ReactNode;
};

type ConfigState =
    | {
          state: "loaded";
          config: Config;
      }
    | {
          state: "loading";
      }
    | {
          state: "error";
          error: string;
      };

const invalidConfigurationMessage = "This frontend is configured incorrectly, please contact your server administrator";

export const ConfigProvider: React.FC<ConfigProviderProps> = ({ children }) => {
    const [state, setState] = React.useState<ConfigState>({ state: "loading" });

    React.useEffect(() => {
        const fetcher = async () => {
            try {
                const path = environment.production ? "/config.json" : "/assets/config.json";
                const resp = await fetch(path, { headers: { "Content-Type": "application/json" } });
                const data = await resp.json();
                const parsed = configSchema.safeParse(data);
                if (parsed.success) {
                    setState({ state: "loaded", config: parsed.data });
                } else {
                    setState({ state: "error", error: invalidConfigurationMessage });
                }
            } catch (e) {
                setState({ state: "error", error: invalidConfigurationMessage });
            }
        };
        fetcher();
    }, []);

    if (state.state === "loading") {
        return <Loading />;
    }

    if (state.state === "error") {
        return (
            <Alert severity="error">
                <AlertTitle>Error loading config: {state.error}</AlertTitle>
            </Alert>
        );
    }

    return <ConfigContext.Provider value={state.config}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
    return React.useContext(ConfigContext);
};
