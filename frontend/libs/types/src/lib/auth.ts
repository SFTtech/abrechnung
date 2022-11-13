export interface Session {
    id: number;
    name: string;
    validUntil: string;
    lastSeen: string;
}

export interface User {
    id: number;
    username: string;
    email: string;
    isGuestUser: boolean;
    registeredAt: string;
    sessions: Session[];
}
