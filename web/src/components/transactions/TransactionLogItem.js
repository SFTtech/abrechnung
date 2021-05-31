import React from "react";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";


export default function TransactionLogItem({group, transaction}) {
    return (
        <ListGroup.Item className={"d-flex justify-content-between"}>
            <span>{transaction.description}</span>
            <div>
                <span>{transaction.value} {transaction.currency_symbol}</span>
                <LinkContainer
                    to={`/groups/${group.group_id}/transactions/${transaction.transaction_id}`}>
                    <button className="btn text-info">
                        <FontAwesomeIcon icon={faPencilAlt}/>
                    </button>
                </LinkContainer>
            </div>
        </ListGroup.Item>
    );
}
