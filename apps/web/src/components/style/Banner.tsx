import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { useConfig } from "@/core/config";

export const Banner: React.FC = () => {
    const cfg = useConfig();
    return cfg.messages?.map((message, idx) => (
        <Alert key={idx} sx={{ borderRadius: 0 }} color={message.type}>
            {message.title && <AlertTitle>{message.title}</AlertTitle>}
            {message.body}
        </Alert>
    ));
};
