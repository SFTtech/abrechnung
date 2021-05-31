import React from "react";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import TransactionLogItem from "./TransactionLogItem";
import Button from "react-bootstrap/cjs/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";
import {LinkContainer} from "react-router-bootstrap";
import {useRouteMatch} from "react-router-dom";
import {useRecoilValue} from "recoil";
import {groupTransactions} from "../../recoil/transactions";


export default function TransactionLog({group}) {
    const match = useRouteMatch();
    const transactions = useRecoilValue(groupTransactions(group.group_id));
    // TODO

    return (
        <Row>
            <Col xs={12}>
                <ListGroup variant={"flush"}>
                    {transactions.length === 0 ? (
                        <ListGroup.Item key={0}>No Transactions</ListGroup.Item>
                    ) : (
                        transactions.map(transaction => {
                            return <TransactionLogItem key={transaction.transaction_id}
                                                       group={group}
                                                       transaction={transaction}/>
                        }))}
                </ListGroup>
                <div className={"d-flex mt-3 justify-content-center"}>
                    <LinkContainer to={`${match.url}/new`}>
                        <Button variant={"outline-success"}><FontAwesomeIcon icon={faPlus}/></Button>
                    </LinkContainer>
                </div>
            </Col>
        </Row>
    );
}
