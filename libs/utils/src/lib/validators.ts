import { z } from "zod";

export const emailValidator = (email: string) => {
    const re = /\S+@\S+\.\S+/;

    if (!email || email.length <= 0) return "Email cannot be empty.";
    if (!re.test(email)) return "Ooops! We need a valid email address.";

    return "";
};

export const urlValidator = (url: string) => {
    if (!url || url.length <= 0) return "URL cannot be empty.";

    try {
        new URL(url);
    } catch (_) {
        return "Invalid URL";
    }

    return "";
};

export const passwordValidator = (password: string) => {
    if (!password || password.length <= 0) return "Password cannot be empty.";

    return "";
};

export const nameValidator = (name: string) => {
    if (!name || name.length <= 0) return "Name cannot be empty.";

    return "";
};

export class ValidationError extends Error {
    public override name = "ValidationError";

    public inner: Array<{ path: string; message: string }> = [];

    public constructor(message: string) {
        super(message);
    }
}
