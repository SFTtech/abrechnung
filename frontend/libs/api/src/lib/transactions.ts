import { Transaction, TransactionAttachment, TransactionContainer, TransactionPosition } from "@abrechnung/types";
import {
    FileAttachment as BackendFileAttachment,
    TransactionPosition as BackendPosition,
    Transaction as BackendTransaction,
    TransactionDetails as BackendTransactionDetails,
} from "./generated";

export const backendPositionToPosition = (transactionID: number, position: BackendPosition): TransactionPosition => {
    return {
        id: position.id,
        transactionID: transactionID,
        name: position.name,
        price: position.price,
        communistShares: position.communist_shares,
        usages: position.usages,
        deleted: position.deleted,
    };
};

export const backendAttachmentToAttachment = (
    transactionID: number,
    a: BackendFileAttachment
): TransactionAttachment => {
    return {
        id: a.id,
        transactionID: transactionID,
        blobID: a.blob_id as number,
        filename: a.filename,
        deleted: a.deleted,
        url: a.host_url as string,
    };
};

export const backendTransactionToTransaction = (transaction: BackendTransaction): TransactionContainer => {
    const detailsToFields = (details: BackendTransactionDetails) => {
        return {
            deleted: details.deleted,
            billedAt: details.billed_at,
            value: details.value,
            currencySymbol: details.currency_symbol,
            currencyConversionRate: details.currency_conversion_rate,
            debitorShares: details.debitor_shares,
            creditorShares: details.creditor_shares,
            name: details.name,
            description: details.description,
            tags: details.tags,
        };
    };

    const pendingPositionMap = (transaction.pending_positions ?? []).reduce<{ [k: number]: TransactionPosition }>(
        (map, position) => {
            map[position.id] = backendPositionToPosition(transaction.id, position);
            return map;
        },
        {}
    );
    const updatedCommitted: TransactionPosition[] = (transaction.committed_positions ?? []).map((position) => {
        const pending = pendingPositionMap[position.id];
        if (pending !== undefined) {
            delete pendingPositionMap[position.id];
            return pending;
        } else {
            return backendPositionToPosition(transaction.id, position);
        }
    });
    const mergedPositions = updatedCommitted.concat(...Object.values(pendingPositionMap));

    const pendingFileMap = (transaction.pending_files ?? []).reduce<{ [k: number]: TransactionAttachment }>(
        (map, file) => {
            map[file.id] = backendAttachmentToAttachment(transaction.id, file);
            return map;
        },
        {}
    );
    const updatedCommittedFiles: TransactionAttachment[] = (transaction.committed_files ?? []).map((file) => {
        const pending = pendingFileMap[file.id];
        if (pending !== undefined) {
            delete pendingFileMap[file.id];
            return pending;
        } else {
            return backendAttachmentToAttachment(transaction.id, file);
        }
    });
    const mergedFiles = updatedCommittedFiles.concat(...Object.values(pendingFileMap));

    const mappedDetails = detailsToFields(
        (transaction.pending_details ?? transaction.committed_details) as BackendTransactionDetails
    );

    let t: Transaction;
    if (transaction.type === "transfer") {
        t = {
            id: transaction.id,
            groupID: transaction.group_id,
            type: "transfer",
            isWip: transaction.is_wip,
            lastChanged: transaction.last_changed,
            hasLocalChanges: false,
            ...mappedDetails,
            attachments: mergedFiles.map((f) => f.id),
        };
    } else if (transaction.type === "purchase") {
        t = {
            id: transaction.id,
            groupID: transaction.group_id,
            type: "purchase",
            isWip: transaction.is_wip,
            lastChanged: transaction.last_changed,
            hasLocalChanges: false,
            ...mappedDetails,
            positions: mergedPositions.map((p) => p.id),
            attachments: mergedFiles.map((f) => f.id),
        };
    } else {
        throw new Error("cannot deal with mimo type transactions");
    }

    return {
        transaction: t,
        positions: mergedPositions,
        attachments: mergedFiles,
    };
};

export function toBackendPosition(positions: Array<TransactionPosition>): Array<BackendPosition> {
    return positions.map((p) => {
        return {
            id: p.id,
            price: p.price,
            communist_shares: p.communistShares,
            deleted: p.deleted,
            name: p.name,
            usages: p.usages,
        };
    });
}
