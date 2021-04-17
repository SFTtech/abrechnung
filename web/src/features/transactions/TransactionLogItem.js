import React, {Component} from "react";
import {connect} from "react-redux";

import {Accordion} from "react-bootstrap";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {LinkContainer} from "react-router-bootstrap";
import {faPencilAlt} from "@fortawesome/free-solid-svg-icons/faPencilAlt";
import Card from "react-bootstrap/cjs/Card";


class Transaction extends Component {
    state = {};

    render() {
        return (
            <Accordion>
                <Card key={this.props.transaction.transaction_id}>
                    <Card.Body>
                        <Accordion.Toggle as={"div"} eventKey={"0"}>
                            <div className={"d-flex justify-content-between"}>
                                <span>{this.props.transaction.description}</span>
                                <div>
                                    <span>{this.props.transaction.value} {this.props.transaction.currency_symbol}</span>
                                    <LinkContainer
                                        to={`/groups/${this.props.group.group_id}/transactions/${this.props.transaction.transaction_id}`}>
                                        <button className="btn text-info">
                                            <FontAwesomeIcon icon={faPencilAlt}/>
                                        </button>
                                    </LinkContainer>
                                </div>
                            </div>
                        </Accordion.Toggle>
                        <Accordion.Collapse eventKey={"0"}>
                            <>
                                <hr/>
                                <span>Collapsed transaction info</span>
                            </>
                        </Accordion.Collapse>

                    </Card.Body>
                </Card>
            </Accordion>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.transactions.status,
    error: state.transactions.error,
});

export default connect(mapStateToProps, null)(Transaction);
