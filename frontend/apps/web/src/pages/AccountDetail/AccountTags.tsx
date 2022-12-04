import { selectAccountById, wipAccountUpdated } from "@abrechnung/redux";
import React from "react";
import { TagSelector } from "../../components/TagSelector";
import { selectAccountSlice, useAppDispatch, useAppSelector } from "../../store";

interface Props {
    groupId: number;
    accountId: number;
}

export const AccountTags: React.FC<Props> = ({ groupId, accountId }) => {
    const dispatch = useAppDispatch();

    const account = useAppSelector((state) =>
        selectAccountById({ state: selectAccountSlice(state), groupId, accountId })
    );

    if (account.type !== "clearing") {
        return null;
    }

    const handleChange = (newTags: string[]) => {
        dispatch(wipAccountUpdated({ ...account, tags: newTags }));
    };

    return (
        <TagSelector
            margin="normal"
            fullWidth
            label="Tags"
            groupId={groupId}
            value={account.tags}
            editable={account.isWip}
            onChange={handleChange}
        />
    );
};
