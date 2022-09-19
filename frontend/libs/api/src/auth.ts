import { Buffer } from "buffer";

export function validateJWTToken(token: string): boolean {
    const payload = token.split(".")[1];
    try {
        const { exp: expires } = JSON.parse(Buffer.from(payload, "base64").toString("ascii"));
        if (typeof expires === "number" && expires > new Date().getTime() / 1000) {
            return true;
        }
    } catch {
        return false;
    }
    return false;
}
