import React from "react";
import { Alert, AlertTitle } from "@mui/material";
import { useRecoilValue } from "recoil";
import { config } from "../../state/config";

export const Banner: React.FC = () => {
    const cfg = useRecoilValue(config);
    if (cfg.error) {
        return (
            <Alert sx={{ borderRadius: 0 }} color="error">
                {cfg.error}
            </Alert>
        );
    }
    return (
        <>
            {cfg.messages.map((message, idx) => (
                <Alert key={idx} sx={{ borderRadius: 0 }} color={message.type}>
                    {message.title && <AlertTitle>{message.title}</AlertTitle>}
                    {message.body}
                </Alert>
            ))}
        </>
    );
};

export default Banner;
