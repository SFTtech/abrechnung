import {atomFamily, selectorFamily} from "recoil";
import {ws} from "../websocket";
import {fetchToken} from "./auth";

const fetchRevisions = async groupID => {
    return ws.call("revision_list", {
        authtoken: fetchToken(),
        group_id: groupID,
    });
}

export const revisions = atomFamily({
    key: "revisions",
    default: selectorFamily({
        key: "revisions/default",
        get: groupID => async ({get}) => {
            return await fetchRevisions(groupID);
        }
    }),
    effects_UNSTABLE: groupID => [
        ({setSelf, trigger}) => {
            ws.subscribe(fetchToken(), "revision", ({element_id}) => {
                if (element_id === groupID) {
                    console.log("reloading revisions")
                    fetchRevisions(groupID).then(result => setSelf(result));
                }
            }, {element_id: groupID})
            // TODO: handle registration errors

            return () => {
                ws.unsubscribe("revision", {element_id: groupID});
            };
        }
    ]
})

export const uncommitedRevisions = selectorFamily({
    key: "revision",
    get: groupID => async ({get}) => {
        const r = get(revisions(groupID));
        return r.filter(revision => revision.commited === null);
    }
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
