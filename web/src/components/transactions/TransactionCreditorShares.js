import React from "react";
import ListGroup from "react-bootstrap/ListGroup";
import {useRecoilValue} from "recoil";
import {transactionCreditorShares} from "../../recoil/transactions";


export default function TransactionCreditorShares({group, transaction}) {
    const shares = useRecoilValue(transactionCreditorShares({
        groupID: group.group_id,
        transactionID: transaction.transaction_id
    }));

    return (
        <div>
            <ListGroup className={"mb-2"} variant={"flush"}>
                {shares.map(share => {
                    return (
                        <ListGroup.Item>
                            <span>{share.account_id} - {share.shares}</span>
                        </ListGroup.Item>
                    )
                })}
            </ListGroup>
        </div>
    );
}
