import {atom} from "recoil";


const localStorageEffect = key => ({setSelf, onSet}) => {
    const savedValue = localStorage.getItem(key);
    if (savedValue != null) {
        setSelf(JSON.parse(savedValue));
    }

    onSet((newValue, _, isReset) => {
        isReset
            ? localStorage.removeItem(key)
            : localStorage.setItem(key, JSON.stringify(newValue))
    });
}


export const themeSettings = atom({
    key: "themeSettings",
    default: {darkMode: "browser"}, // one of "dark", "light", "browser"
    effects_UNSTABLE: [
        localStorageEffect("settings.theme")
    ]
})

export const transactionSettings = atom({
    key: "transactionSettings",
    default: {showRemainingValue: true}, // one of "dark", "light", "browser"
    effects_UNSTABLE: [
        localStorageEffect("settings.transactions")
    ]
})
