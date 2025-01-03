import * as React from "react";
import { Loading } from "@abrechnung/components";
import { Alert, AlertTitle } from "@mui/material";
import { FrontendConfig, useGetFrontendConfigQuery } from "./generated/api";

const ConfigContext = React.createContext<FrontendConfig>(null as unknown as FrontendConfig);

export const ConfigProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { data: config, isLoading, isError } = useGetFrontendConfigQuery();

    if (isError) {
        return (
            <Alert severity="error">
                <AlertTitle>Error loading config</AlertTitle>
            </Alert>
        );
    }

    if (isLoading || !config) {
        return <Loading />;
    }

    return <ConfigContext.Provider value={config}>{children}</ConfigContext.Provider>;
};

export const useConfig = () => {
    return React.useContext(ConfigContext);
};
