import React from "react";
import PurchaseDebitorShares from "../../components/transactions/PurchaseDebitorShares";
import TransactionCreditorShare from "./TransactionCreditorShare";
import TransactionDescription from "./TransactionDescription";
import TransactionBilledAt from "./TransactionBilledAt";
import TransactionValue from "./TransactionValue";

import PurchaseItems from "./purchase/PurchaseItems";
import { Accordion, AccordionDetails, AccordionSummary, Typography } from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import { makeStyles } from "@mui/styles";

const useStyles = makeStyles((theme) => ({
    root: {
        width: "100%"
    },
    heading: {
        fontSize: theme.typography.pxToRem(15),
        fontWeight: theme.typography.fontWeightRegular
    },
    ".MuiAccordion-root": {
        border: null
    }
}));

export default function PurchaseDetails({ group, transaction }) {
    const classes = useStyles();

    return (
        <>
            <TransactionDescription group={group} transaction={transaction} />
            <TransactionBilledAt group={group} transaction={transaction} />

            <TransactionCreditorShare
                group={group}
                transaction={transaction}
                isEditing={transaction.is_wip}
                label="Paid for by"
            />

            <TransactionValue group={group} transaction={transaction} />

            <PurchaseDebitorShares group={group} transaction={transaction} isEditing={transaction.is_wip} />
        </>
    );
}

