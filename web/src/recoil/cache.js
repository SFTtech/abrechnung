export const CACHE_VERSION = 3;

export const checkCacheVersion = () => {
    const currentCacheVersion = localStorage.getItem("cacheVersion");
    if (currentCacheVersion != null && parseInt(currentCacheVersion) !== undefined && parseInt(currentCacheVersion) < CACHE_VERSION) {
        console.log(`New cache version ${CACHE_VERSION} required, found version ${currentCacheVersion} - clearing and repopulating cache ...`);
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
