import React, {Suspense} from "react";
import {useRouteMatch} from "react-router-dom";
import {useRecoilValue, useResetRecoilState} from "recoil";
import {commitRevision, discardRevision, startEditTransaction, transaction} from "../recoil/transactions";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/cjs/Col";
import Loading from "../components/Loading";
import TransactionCreditorShares from "../components/transactions/TransactionCreditorShares";
import TransactionShares from "../components/transactions/TransactionDebitorShares";
import {sessionToken} from "../recoil/auth";
import TransactionDetail from "../components/transactions/TransactionDetail";
import {revisions, uncommitedTransactionRevision} from "../recoil/revision";


export default function Transaction({group}) {
    const match = useRouteMatch();
    const transactionID = parseInt(match.params.id);
    const authtoken = useRecoilValue(sessionToken);
    const reloadRevisions = useResetRecoilState(revisions(group.group_id));
    const wipRevision = useRecoilValue(uncommitedTransactionRevision({
        groupID: group.group_id,
        transactionID: transactionID
    }));

    const t = useRecoilValue(transaction({groupID: group.group_id, transactionID: transactionID}));
    // TODO: handle 404
    // TODO: wait for transaction to actually load in case we are redirected from create transaction
    // TODO: get latest revision of this transaction to determine if we are in edit mode or not
    // TODO: if we are enable editing
    // TODO: add edit button that opens a new revision
    // TODO: in edit mode add cancel button

    const edit = () => {
        startEditTransaction({sessionToken: authtoken, transactionID: transactionID})
            .then(result => {
                reloadRevisions();
            })
            .catch(err => {

            })
    }

    const abortEdit = () => {
        if (wipRevision !== null) {
            discardRevision({sessionToken: authtoken, revisionID: wipRevision.revision_id})
                .then(result => {
                })
                .catch(err => {

                })
        }
    }

    const commitEdit = () => {
        if (wipRevision !== null) {
            commitRevision({sessionToken: authtoken, revisionID: wipRevision.revision_id})
                .then(result => {
                    reloadRevisions();
                })
                .catch(err => {

                })
        }
    }

    return (
        <>
            <Row>
                <Col xs={12} md={12}>
                    <div>
                        {wipRevision !== null ? (
                            <div className="d-flex justify-content-between">
                                <span className="badge bg-info text-white">WIP</span>
                                <div>
                                    <button className="btn btn-outline-success" onClick={commitEdit}>Save</button>
                                    <button className="btn btn-danger ml-2" onClick={abortEdit}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <div className="d-flex justify-content-end">
                                <button onClick={edit} className="btn btn-outline-info">edit</button>
                            </div>
                        )}
                    </div>
                    <TransactionDetail group={group} transaction={t} wipRevision={wipRevision}/>
                    <span className="font-weight-bold">Paid for by</span>
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

