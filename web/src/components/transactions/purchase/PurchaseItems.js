import React, {Component} from "react";
import {connect} from "react-redux";

import ListGroup from "react-bootstrap/ListGroup";
import Button from "react-bootstrap/cjs/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";


class PurchaseItems extends Component {
    state = {};

    render() {
        return (
            <>
                <ListGroup variant={"flush"}>
                    <ListGroup.Item key={0} className={"d-flex justify-content-between"}>
                        <span>Mörchen</span>
                        <span>1.99€</span>
                    </ListGroup.Item>
                    <ListGroup.Item key={1} className={"d-flex justify-content-between"}>
                        <span>Plupp</span>
                        <span>2.99€</span>
                    </ListGroup.Item>
                </ListGroup>
                <div className={"d-flex mt-2 justify-content-center"}>
                    <Button variant={"success"}><FontAwesomeIcon icon={faPlus}/></Button>
                </div>
            </>
        );
    }
}

export default connect(null, null)(PurchaseItems);
