import { ApiError } from "@abrechnung/api";
import z from "zod";

const ErrorSchema = z.object({
    type: z.string(),
    id: z.string(),
    message: z.string(),
});

export const stringifyError = (error: any): string => {
    if (typeof error === "string") {
        return error;
    }
    if (error instanceof ApiError) {
        let body = error.body;
        if (typeof body !== "object") {
            return "unknown error";
        }
        try {
            const validated = ErrorSchema.parse(body);
            return validated.message;
        } catch {
            return error.message;
        }
    }
    if (error instanceof Error) {
        return error.message;
    }

    return String(error);
};
