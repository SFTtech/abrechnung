import { TransactionType } from "@abrechnung/api";
import { PurchaseIcon, TransferIcon } from "@/components/style/AbrechnungIcons";
import { Tooltip } from "@mui/material";
import * as React from "react";
import { useTranslation } from "react-i18next";
import { HelpOutline } from "@mui/icons-material";

export const TransactionIcon: React.FC<{ type: TransactionType }> = ({ type }) => {
    const { t } = useTranslation();

    if (type === "purchase") {
        return (
            <Tooltip title={t("transactions.purchase")}>
                <PurchaseIcon color="primary" />
            </Tooltip>
        );
    }
    if (type === "transfer") {
        return (
            <Tooltip title={t("transactions.transfer")}>
                <TransferIcon color="primary" />
            </Tooltip>
        );
    }

    return (
        <Tooltip title="Unknown Transaction Type">
            <HelpOutline color="primary" />
        </Tooltip>
    );
};
