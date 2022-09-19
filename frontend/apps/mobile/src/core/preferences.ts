import React from "react";

export const PreferencesContext = React.createContext({
    toggleTheme: () => {
    },
    isThemeDark: false,
});