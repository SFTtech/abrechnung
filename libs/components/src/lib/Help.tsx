import { Tooltip } from "@mui/material";
import { HelpOutline as HelpIcon } from "@mui/icons-material";
import * as React from "react";

export type HelpProps = {
    title: string;
};

export const Help: React.FC<HelpProps> = ({ title }) => {
    return (
        <Tooltip title={title}>
            <HelpIcon color="primary" />
        </Tooltip>
    );
};
