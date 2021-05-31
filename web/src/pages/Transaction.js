import React, {Suspense} from "react";
import {useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {transaction} from "../recoil/transactions";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/cjs/Col";
import Loading from "../components/Loading";
import TransactionCreditorShares from "../components/transactions/TransactionCreditorShares";
import TransactionShares from "../components/transactions/TransactionDebitorShares";


export default function Transaction({group}) {
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);

    const t = useRecoilValue(transaction({groupID: group.group_id, transactionID: transactionID}));
    // TODO: get latest revision of this transaction to determine if we are in edit mode or not
    // TODO: if we are enable editing
    // TODO: add edit button that opens a new revision
    // TODO: in edit mode add cancel button

    return (
        <>
            <Row>
                <Col xs={12} md={12}>
                    <span className={"font-weight-bold"}>Description</span>
                    <div className={"d-flex justify-content-between"}>
                        <span className={"text-field"}>{t.description}</span>
                    </div>
                    <span className={"font-weight-bold"}>Value</span>
                    <div className={"d-flex justify-content-between"}>
                        <span className={"text-field"}>{t.value}</span>
                    </div>
                    <span className={"font-weight-bold"}>Currency</span>
                    <div className={"d-flex justify-content-between"}>
                        <span className={"text-field"}>{t.currency_symbol}</span>
                    </div>
                    <span className={"font-weight-bold"}>Paid for by</span>
                    <Suspense fallback={<Loading/>}>
                        <TransactionCreditorShares group={group} transaction={t}/>
                    </Suspense>
                </Col>
                <Col xs={12} md={12}>
                    <h5>Transaction Shares</h5>
                    <Suspense fallback={<Loading/>}>
                        <TransactionShares group={group} transaction={t}/>
                    </Suspense>
                </Col>
            </Row>

            {/*<hr/>*/}
            {/*<h5>Items</h5>*/}
            {/*<PurchaseItems group={this.props.group} transaction={transaction}/>*/}
        </>
    );
}

