import {atomFamily, selectorFamily} from "recoil";
import {ws} from "../../websocket";
import {sessionToken} from "../auth";

export const revisions = atomFamily({
    key: "revisions",
    default: selectorFamily({
        key: "revisions/default",
        get: groupID => async ({get}) => {
            return ws.call("revision_list", {
                authtoken: get(sessionToken),
                group_id: groupID,
            });
        }
    })
})

export const revision = selectorFamily({
    key: "revision",
    get: ({groupID, revisionID}) => async ({get}) => {
        const r = get(revisions(groupID));
        return r?.find(revision => revision.revision_id === revisionID);
    }
})

export const transactionRevisions = selectorFamily({
    key: "transactionRevisions",
    get: ({groupID, transactionID}) => async ({get}) => {
        const r = get(revisions(groupID));
        return r?.filter(revision => revision.transaction_id === transactionID);
    }
})

export const uncommitedTransactionRevision = selectorFamily({
    key: "uncommitedTransactionRevision",
    get: ({groupID, transactionID}) => async ({get}) => {
        const r = get(transactionRevisions({groupID: groupID, transactionID: transactionID}));
        return r?.find(revision => revision.commited === null) ?? null;
    }
})
