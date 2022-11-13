import {
    TransactionContainer,
    TransactionAttachment,
    TransactionPosition,
    TransactionShare,
    TransactionType,
} from "@abrechnung/types";

export interface BackendTransactionDetails {
    billed_at: string;
    currency_symbol: string;
    currency_conversion_rate: number;
    value: number;
    debitor_shares: TransactionShare;
    creditor_shares: TransactionShare;
    description: string;
    revision_committed_at: string;
    revision_started_at: string;
    deleted: boolean;
}

export interface BackendPosition {
    id: number;
    name: string;
    price: number;
    communist_shares: number;
    usages: { [k: number]: number };
    deleted: boolean;
}

export interface BackendTransactionAttachment {
    id: number;
    filename: string;
    blob_id: number;
    deleted: boolean;
    url: string;
}

export interface BackendTransaction {
    id: number;
    group_id: number;
    version: number;
    is_wip: boolean;
    type: TransactionType;
    last_changed: string;
    committed_details: BackendTransactionDetails | null;
    pending_details: BackendTransactionDetails | null;
    pending_positions?: Array<BackendPosition>;
    committed_positions?: Array<BackendPosition>;
    pending_files: Array<BackendTransactionAttachment>;
    committed_files: Array<BackendTransactionAttachment>;
}

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
    a: BackendTransactionAttachment
): TransactionAttachment => {
    return {
        id: a.id,
        transactionID: transactionID,
        blobID: a.blob_id,
        filename: a.filename,
        deleted: a.deleted,
        url: a.url,
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
            description: details.description,
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

    return {
        transaction: {
            id: transaction.id,
            groupID: transaction.group_id,
            type: transaction.type,
            isWip: transaction.is_wip,
            lastChanged: transaction.last_changed,
            hasLocalChanges: false,
            ...mappedDetails,
            positions: mergedPositions.map((p) => p.id),
            attachments: mergedFiles.map((f) => f.id),
        },
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
