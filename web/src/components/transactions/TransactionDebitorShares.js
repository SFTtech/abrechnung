import React from "react";
import ListGroup from "react-bootstrap/ListGroup";
import {useRecoilValue} from "recoil";
import {transactionDebitorShares} from "../../recoil/transactions";


export default function TransactionDebitorShares({group, transaction}) {
    const shares = useRecoilValue(transactionDebitorShares(transaction.transaction_id));

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
