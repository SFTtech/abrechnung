// import { Account } from "@abrechnung/types";
// import { atomFamily } from "recoil";
// import { api, ws } from "../core/api";
// import { toast } from "react-toastify";
// import { DateTime } from "luxon";

// const groupAccounts = atomFamily<Array<Account>, number>({
//     key: "groupAccounts",
//     effects_UNSTABLE: (groupID) => [
//         ({ setSelf, getPromise, node }) => {
//             // TODO: handle fetch error
//             setSelf(api.fetchAccounts(groupID));

//             const fetchAndUpdateAccount = (currAccounts: Array<Account>, accountID: number, isNew: boolean) => {
//                 api.fetchAccount(accountID)
//                     .then((account) => {
//                         if (isNew) {
//                             // new account
//                             setSelf([...currAccounts, account]);
//                         } else {
//                             setSelf(currAccounts.map((t) => (t.id === account.id ? account : t)));
//                         }
//                     })
//                     .catch((err) => toast.error(`error when fetching account: ${err}`));
//             };

//             ws.subscribe(
//                 "account",
//                 groupID,
//                 (subscription_type, { account_id, element_id, revision_committed, revision_version }) => {
//                     console.log(subscription_type, account_id, element_id, revision_committed, revision_version);
//                     if (element_id === groupID) {
//                         getPromise(node).then((currAccounts) => {
//                             const currAccount = currAccounts.find((a) => a.id === account_id);
//                             if (
//                                 currAccount === undefined ||
//                                 // (revision_committed === null && revision_version > currAccount.version) ||
//                                 (revision_committed !== null &&
//                                     (currAccount.lastChanged === null ||
//                                         DateTime.fromISO(revision_committed) >
//                                             DateTime.fromISO(currAccount.lastChanged)))
//                             ) {
//                                 fetchAndUpdateAccount(currAccounts, account_id, currAccount === undefined);
//                             }
//                         });
//                     }
//                 }
//             );
//             // TODO: handle registration errors

//             return () => {
//                 ws.unsubscribe("account", groupID);
//             };
//         },
//     ],
// });
