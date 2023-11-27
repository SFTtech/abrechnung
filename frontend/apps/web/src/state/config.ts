import { selector } from "recoil";
import axios from "axios";
import { z } from "zod";
import DevConfig from "../assets/config.json";
import { environment } from "@/environments/environment";
import { AlertColor } from "@mui/material/Alert/Alert";

const configSchema = z.object({
    imprintURL: z.string().optional().nullable(),
    sourceCodeURL: z.string().optional(),
    issueTrackerURL: z.string().optional().nullable(),
    messages: z
        .array(
            z.object({
                type: z.union([z.literal("info"), z.literal("error"), z.literal("warning"), z.literal("success")]),
                title: z.string().default(null).nullable(),
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

export const config = selector<Config>({
    key: "config",
    get: async ({ get }) => {
        if (!environment.production) {
            return DevConfig as Config;
        }

        try {
            const resp = await axios.get("/config.json", {
                headers: { "Content-Type": "application/json" },
            });
            try {
                return await configSchema.parseAsync(await resp.data);
            } catch (e) {
                console.log(e);
                return {
                    error: "This frontend is configured incorrectly, please contact your server administrator",
                };
            }
        } catch {
            return {
                error: "This frontend is configured incorrectly, please contact your server administrator",
            };
        }
    },
});
