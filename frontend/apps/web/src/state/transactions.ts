import { atomFamily } from "recoil";
import { api, ws } from "../core/api";
import { DateTime } from "luxon";
import { toast } from "react-toastify";
import { TransactionContainer } from "@abrechnung/types";

// const groupTransactionContainers = atomFamily<TransactionContainer[], number>({
//     key: "groupTransactions",
//     effects: (groupID: number) => [
//         ({ setSelf, node, getPromise }) => {
//             console.log("group transactions", groupID);
//             const fullFetchPromise = (): Promise<TransactionContainer[]> => {
//                 return api.fetchTransactions(groupID).catch((err) => {
//                     toast.error(`error when fetching transactions: ${err}`);
//                     return [];
//                 });
//             };

//             // TODO: handle fetch error more properly than just showing error, e.g. through a retry or something
//             setSelf(fullFetchPromise());

//             const fetchAndUpdateTransaction = (
//                 currTransactions: TransactionContainer[],
//                 transactionID: number,
//                 isNew: boolean
//             ) => {
//                 api.fetchTransaction(transactionID)
//                     .then((transaction) => {
//                         if (isNew) {
//                             setSelf([...currTransactions, transaction]);
//                         } else {
//                             setSelf(
//                                 currTransactions.map((t) =>
//                                     t.transaction.id === transaction.transaction.id ? transaction : t
//                                 )
//                             );
//                         }
//                     })
//                     .catch((err) => toast.error(`error when fetching transaction: ${err}`));
//             };

//             ws.subscribe(
//                 "transaction",
//                 groupID,
//                 (
//                     subscription_type,
//                     { element_id, transaction_id, revision_started, revision_committed, revision_version }
//                 ) => {
//                     console.log(
//                         subscription_type,
//                         transaction_id,
//                         element_id,
//                         revision_started,
//                         revision_committed,
//                         revision_version
//                     );
//                     if (element_id === groupID) {
//                         getPromise(node).then((currTransactions) => {
//                             const currTransaction = currTransactions.find((t) => t.transaction.id === transaction_id);
//                             if (
//                                 currTransaction === undefined ||
//                                 //(revision_committed === null && revision_version > currTransaction.version) ||
//                                 (revision_committed !== null &&
//                                     (currTransaction.transaction.lastChanged === null ||
//                                         DateTime.fromISO(revision_committed) >
//                                             DateTime.fromISO(currTransaction.transaction.lastChanged)))
//                             ) {
//                                 fetchAndUpdateTransaction(
//                                     currTransactions,
//                                     transaction_id,
//                                     currTransaction === undefined
//                                 );
//                             }
//                         });
//                     }
//                 }
//             );
//             // TODO: handle registration errors

//             return () => {
//                 ws.unsubscribe("transaction", groupID);
//             };
//         },
//     ],
// });
