import React, {useState} from "react";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

import ListGroup from "react-bootstrap/ListGroup";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faTrash} from "@fortawesome/free-solid-svg-icons";
import Button from "react-bootstrap/cjs/Button";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";
import {useRecoilValue} from "recoil";
import {groupAccounts} from "../../recoil/groups";
import AccountCreateModal from "./AccountCreateModal";


export default function Accounts({group}) {
    const [showAccountCreationModal, setShowAccountCreationModal] = useState(false);
    const accounts = useRecoilValue(groupAccounts(group.group_id));

    return (
        <Row>
            <Col xs={12}>
                <ListGroup variant={"flush"}>
                    {accounts.length === 0 ? (
                        <ListGroup.Item key={0}>
                            <span>No Accounts</span>
                        </ListGroup.Item>
                    ) : (
                        accounts.map(account => {
                            return (
                                <ListGroup.Item
                                    key={account.account_id}
                                    className={"d-flex justify-content-between"}
                                >
                                    <div>
                                        <span>{account.name}</span>
                                        <br/>
                                        <small className="text-muted">{account.description}</small>
                                    </div>
                                    <div>
                                        <button
                                            className="btn text-info"
                                        >
                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                        </button>
                                        <button
                                            className="btn text-danger"
                                        >
                                            <FontAwesomeIcon icon={faTrash}/>
                                        </button>
                                    </div>
                                </ListGroup.Item>
                            );
                        })
                    )}
                </ListGroup>
                <div className={"d-flex justify-content-center"}>
                    <Button variant={"outline-success"}
                            onClick={() => setShowAccountCreationModal(true)}><FontAwesomeIcon
                        icon={faPlus}/></Button>
                </div>
                <AccountCreateModal show={showAccountCreationModal} onClose={() => setShowAccountCreationModal(false)}
                                    group={group}/>
            </Col>
        </Row>
    );
}
