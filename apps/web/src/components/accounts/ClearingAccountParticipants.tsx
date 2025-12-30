import { useAppSelector } from "@/store";
import { selectAccountIdToAccountMap } from "@abrechnung/redux";
import { ClearingAccount } from "@abrechnung/types";
import * as React from "react";
import { Trans } from "react-i18next";

type ClearingAccountParticipantsProps = {
    groupId: number;
    account: ClearingAccount;
};

export const ClearingAccountParticipants: React.FC<ClearingAccountParticipantsProps> = ({ groupId, account }) => {
    const accounts = useAppSelector((state) => selectAccountIdToAccountMap(state, groupId));
    const participatorNames = Object.keys(account.clearing_shares).map((accountId) => accounts[Number(accountId)].name);

    return <Trans i18nKey="events.participants" values={{ participants: participatorNames.join(", ") }} />;
};
