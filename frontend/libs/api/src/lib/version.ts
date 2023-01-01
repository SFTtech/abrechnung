export interface SemVersion {
    version: string;
    major: number;
    minor: number;
    patch: number;
}

export const parseSemVersion = (version: string): SemVersion => {
    const v = version.split(".");
    if (v.length !== 3) {
        throw new Error("invalid version");
    }
    return {
        version: version,
        major: Number(v[0]),
        minor: Number(v[1]),
        patch: Number(v[2]),
    };
};

export const compareSemVersion = (lhs: SemVersion, rhs: SemVersion): number => {
    if (lhs.major > rhs.major) {
        return 1;
    }
    if (lhs.major < rhs.major) {
        return -1;
    }
    if (lhs.minor > rhs.minor) {
        return 1;
    }
    if (lhs.minor < rhs.minor) {
        return -1;
    }
    if (lhs.patch > rhs.patch) {
        return 1;
    }
    if (lhs.patch < rhs.patch) {
        return -1;
    }
    return 0;
};

export const isRequiredVersion = (version: string, minVersion: string, maxVersion: string): boolean => {
    const v = parseSemVersion(version);
    const min = parseSemVersion(minVersion);
    const max = parseSemVersion(maxVersion);

    return compareSemVersion(v, min) >= 0 && compareSemVersion(v, max) < 0;
};
