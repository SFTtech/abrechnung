
export const clearCache = () => {
    for (const key of Object.keys(localStorage)) {
        if (key.startsWith("groups.transactions")) {
            localStorage.removeItem(key);
        }
    }
}