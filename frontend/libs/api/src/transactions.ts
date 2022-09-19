import { Transaction, TransactionPosition } from "@abrechnung/types";
import { fromISOString } from "@abrechnung/utils";

export function backendTransactionToTransaction(transaction): [Transaction, TransactionPosition[]] {
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

    const pendingPositionMap = (transaction.pending_positions ?? []).reduce((map, curr) => {
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
        {
            id: transaction.id,
            group_id: transaction.group_id,
            type: transaction.type,
            version: transaction.version,
            is_wip: transaction.is_wip,
            ...detailsToFields(transaction.committed_details),
            ...detailsToFields(transaction.pending_details),
            has_local_changes: false,
        } as Transaction,
        mergedPositions,
    ];
}

export function toBackendPosition(positions: TransactionPosition[]) {
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
