import { Transaction, TransactionPosition, TransactionShare, TransactionType } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

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

export interface BackendTransaction {
    id: number;
    group_id: number;
    version: number;
    is_wip: boolean;
    type: TransactionType;
    committed_details: BackendTransactionDetails | null;
    pending_details: BackendTransactionDetails | null;
    pending_positions?: Array<BackendPosition>;
    committed_positions?: Array<BackendPosition>;
}

export const backendPositionToPosition = (
    groupID: number,
    transactionID: number,
    position: BackendPosition
): TransactionPosition => {
    return {
        groupID: groupID,
        transactionID: transactionID,
        id: position.id,
        name: position.name,
        price: position.price,
        communistShares: position.communist_shares,
        usages: position.usages,
        deleted: position.deleted,
        hasLocalChanges: false,
    };
};

export function backendTransactionToTransaction(
    transaction: BackendTransaction
): [Transaction, Array<TransactionPosition>] {
    const detailsToFields = (details: BackendTransactionDetails | null) => {
        if (details === null) {
            return {};
        }
        return {
            revisionCommittedAt: fromISOString(details.revision_committed_at),
            revisionStartedAt: fromISOString(details.revision_started_at),
            deleted: details.deleted,
            billedAt: fromISOString(details.billed_at),
            value: details.value,
            currencySymbol: details.currency_symbol,
            currencyConversionRate: details.currency_conversion_rate,
            debitorShares: details.debitor_shares,
            creditorShares: details.creditor_shares,
            description: details.description,
        };
    };

    const pendingPositionMap = new Map<number, TransactionPosition>();

    (transaction.pending_positions ?? []).forEach((position) => {
        pendingPositionMap.set(position.id, backendPositionToPosition(transaction.group_id, transaction.id, position));
    });

    const updatedCommitted: Array<TransactionPosition> = (transaction.committed_positions ?? []).map((position) => {
        const pending = pendingPositionMap.get(position.id);
        if (pending !== undefined) {
            pendingPositionMap.delete(position.id);
            return pending;
        } else {
            return backendPositionToPosition(transaction.group_id, transaction.id, position);
        }
    });
    const mergedPositions = updatedCommitted.concat(...Object.values(pendingPositionMap));

    return [
        {
            id: transaction.id,
            groupID: transaction.group_id,
            type: transaction.type,
            version: transaction.version,
            isWip: transaction.is_wip,
            ...detailsToFields(transaction.committed_details),
            ...detailsToFields(transaction.pending_details),
            hasLocalChanges: false,
        } as Transaction,
        mergedPositions,
    ];
}

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
