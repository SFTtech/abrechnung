import { selector } from "recoil";
import axios from "axios";
import * as yup from "yup";
import { AlertColor } from "@mui/material/Alert/Alert";

const configSchema = yup.object({
    imprintURL: yup.string().nullable(),
    sourceCodeURL: yup.string().required(),
    issueTrackerURL: yup.string().nullable(),
    messages: yup
        .array(
            yup.object({
                type: yup.string().required().oneOf(["info", "error", "warning", "success"]),
                title: yup.string().default(null).nullable(),
                body: yup.string().required(),
            })
        )
        .required(),
});

export interface StatusMessage {
    type: AlertColor;
    title: string | null;
    body: string;
}

export interface Config {
    imprintURL?: string | null;
    sourceCodeURL?: string;
    issueTrackerURL?: string | null;
    messages?: Array<StatusMessage>;
    error?: string;
}

export const config = selector<Config>({
    key: "config",
    get: async ({ get }) => {
        try {
            const resp = await axios.get("/config.json", { headers: { "Content-Type": "application/json" } });
            try {
                return (await configSchema.validate(await resp.data)) as Config;
            } catch (e) {
                console.log(e);
                return { error: "This frontend is configured incorrectly, please contact your server administrator" };
            }
        } catch {
            return { error: "This frontend is configured incorrectly, please contact your server administrator" };
        }
    },
});
