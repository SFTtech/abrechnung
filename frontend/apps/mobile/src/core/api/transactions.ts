import { makeDelete, makeGet, makePost } from "./index";
import { Transaction, TransactionPosition } from "@abrechnung/types";
import { fromISOString, toISODateString } from "../utils";

function backendTransactionToTransaction(transaction): [Transaction, TransactionPosition[]] {
    const detailsToFields = (details) => {
        if (details === null) {
            return {};
        }
        return {
            revision_committed_at: fromISOString(details.revision_committed_at),
            revision_started_at: fromISOString(details.revision_started_at),
            deleted: details.deleted,
            billed_at: fromISOString(details.billed_at),
            value: details.value,
            currency_symbol: details.currency_symbol,
            currency_conversion_rate: details.currency_conversion_rate,
            debitor_shares: details.debitor_shares,
            creditor_shares: details.creditor_shares,
            description: details.description,
        };
    };

    let pendingPositionMap = (transaction.pending_positions ?? []).reduce((map, curr) => {
        map[curr.id] = curr;
        return map;
    }, {});
    const updatedCommitted = (transaction.committed_positions ?? []).map((position) => {
        if (pendingPositionMap.hasOwnProperty(position.id)) {
            const pending = pendingPositionMap[position.id];
            delete pendingPositionMap[position.id];
            return pending;
        } else {
            return position;
        }
    });
    const mergedPositions = updatedCommitted.concat(...Object.values(pendingPositionMap));

    return [
        <Transaction>{
            id: transaction.id,
            group_id: transaction.group_id,
            type: transaction.type,
            version: transaction.version,
            is_wip: transaction.is_wip,
            ...detailsToFields(transaction.committed_details),
            ...detailsToFields(transaction.pending_details),
            has_local_changes: false,
        },
        mergedPositions,
    ];
}

export async function fetchTransactions({
    groupID,
    minLastChanged = null,
    additionalTransactions = null,
}): Promise<[Transaction, TransactionPosition[]][]> {
    let url = `/groups/${groupID}/transactions`;
    if (minLastChanged) {
        url += "?min_last_changed=" + encodeURIComponent(minLastChanged.toISO());
        if (additionalTransactions && additionalTransactions.length > 0) {
            url += "&transaction_ids=" + additionalTransactions.join(",");
        }
    }
    const transactions = await makeGet(url);
    return transactions.map((t) => backendTransactionToTransaction(t));
}

export async function fetchTransaction({ transactionID }): Promise<[Transaction, TransactionPosition[]]> {
    const transaction = await makeGet(`/transactions/${transactionID}`);
    return backendTransactionToTransaction(transaction);
}

function toBackendPosition(positions: TransactionPosition[]) {
    return positions.map((p) => {
        return {
            id: p.id,
            price: p.price,
            communist_shares: p.communist_shares,
            deleted: p.deleted,
            name: p.name,
            usages: p.usages,
        };
    });
}

export async function pushTransactionChanges(
    transaction: Transaction,
    positions: TransactionPosition[],
    performCommit = true
): Promise<[Transaction, TransactionPosition[]]> {
    if (transaction.id < 0) {
        const updatedTransaction = await makePost(`/groups/${transaction.group_id}/transactions`, {
            description: transaction.description,
            value: transaction.value,
            type: transaction.type,
            billed_at: toISODateString(transaction.billed_at),
            currency_symbol: transaction.currency_symbol,
            currency_conversion_rate: transaction.currency_conversion_rate,
            creditor_shares: transaction.creditor_shares,
            debitor_shares: transaction.debitor_shares,
            positions: toBackendPosition(positions),
            perform_commit: performCommit,
        });
        return backendTransactionToTransaction(updatedTransaction);
    } else {
        const updatedTransaction = await makePost(`/transactions/${transaction.id}`, {
            description: transaction.description,
            value: transaction.value,
            billed_at: toISODateString(transaction.billed_at),
            currency_symbol: transaction.currency_symbol,
            currency_conversion_rate: transaction.currency_conversion_rate,
            creditor_shares: transaction.creditor_shares,
            debitor_shares: transaction.debitor_shares,
            positions: toBackendPosition(positions),
            perform_commit: performCommit,
        });
        return backendTransactionToTransaction(updatedTransaction);
    }
}

export async function pushTransactionPositionChanges(
    transactionID: number,
    positions: TransactionPosition[],
    performCommit = true
) {
    let payload = {
        perform_commit: performCommit,
        positions: toBackendPosition(positions),
    };
    return await makePost(`/transactions/${transactionID}/positions`, payload);
}

export async function uploadFile({ transactionID, filename, file, onUploadProgress }) {
    let formData = new FormData();

    formData.append("file", file);
    formData.append("filename", filename);

    return await makePost(`/transactions/${transactionID}/files`, formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
        onUploadProgress,
    });
}

export async function fetchFile({ fileID, blobID }) {
    return makeGet(`/files/${fileID}/${blobID}`, {
        responseType: "blob",
    });
}

export async function deleteFile({ fileID }) {
    return await makeDelete(`/files/${fileID}`);
}

export async function commitTransaction({ transactionID }) {
    return await makePost(`/transactions/${transactionID}/commit`);
}

export async function createTransactionChange({ transactionID }) {
    return await makePost(`/transactions/${transactionID}/new_change`);
}

export async function discardTransactionChange({ transactionID }) {
    return await makePost(`/transactions/${transactionID}/discard`);
}

export async function deleteTransaction({ transactionID }) {
    return await makeDelete(`/transactions/${transactionID}`);
}
