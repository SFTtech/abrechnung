import { Session, User } from "@abrechnung/types";
import { Buffer } from "buffer";

export interface BackendSession {
    id: number;
    name: string;
    valid_until: string;
    last_seen: string;
}

export interface BackendUser {
    id: number;
    username: string;
    email: string;
    is_guest_user: boolean;
    registered_at: string;
    sessions: BackendSession[];
}

export const validateJWTToken = (token: string): boolean => {
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
};

export const backendSessionToSession = (session: BackendSession): Session => {
    return {
        id: session.id,
        name: session.name,
        validUntil: session.valid_until,
        lastSeen: session.last_seen,
    };
};

export const backendUserToUser = (user: BackendUser): User => {
    return {
        id: user.id,
        username: user.username,
        email: user.email,
        isGuestUser: user.is_guest_user,
        registeredAt: user.registered_at,
        sessions: user.sessions.map((s) => backendSessionToSession(s)),
    };
};
