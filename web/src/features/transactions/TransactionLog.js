import React, {Component} from "react";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

import {fetchTransactions} from "./transactionsSlice";
import ListGroup from "react-bootstrap/ListGroup";


class TransactionLog extends Component {
    state = {};

    componentDidMount = () => {
        this.props.fetchTransactions({groupID: this.props.group.id});
    };

    render() {
        return (
            <Row>
                <Col xs={12}>
                    <ListGroup>
                        <ListGroup.Item>Transaction 1</ListGroup.Item>
                        <ListGroup.Item>Transaction 2</ListGroup.Item>
                        <ListGroup.Item>Transaction 3</ListGroup.Item>
                    </ListGroup>
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.transactions.status,
    error: state.transactions.error,
    transactions: state.transactions.entities,
});

export default withRouter(connect(mapStateToProps, {fetchTransactions})(TransactionLog));
