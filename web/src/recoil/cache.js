export const CACHE_VERSION = 3;

export const localStorageEffect =
    (key) =>
    ({ setSelf, onSet }) => {
        const savedValue = localStorage.getItem(key);
        if (savedValue != null) {
            setSelf(JSON.parse(savedValue));
        }

        onSet((newValue, _, isReset) => {
            isReset ? localStorage.removeItem(key) : localStorage.setItem(key, JSON.stringify(newValue));
        });
    };

export const checkCacheVersion = () => {
    const currentCacheVersion = localStorage.getItem("cacheVersion");
    if (
        currentCacheVersion != null &&
        parseInt(currentCacheVersion) !== undefined &&
        parseInt(currentCacheVersion) < CACHE_VERSION
    ) {
        console.log(
            `New cache version ${CACHE_VERSION} required, found version ${currentCacheVersion} - clearing and repopulating cache ...`
        );
        clearCache();
        localStorage.setItem("cacheVersion", String(CACHE_VERSION));
    }
};

export const clearCache = () => {
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith("groups.transactions")) {
            localStorage.removeItem(key);
        }
    }
};
