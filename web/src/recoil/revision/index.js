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
        const revisions = get(revision(groupID));
        return revisions?.find(revision => revision.revision_id === revisionID);
    }
})
