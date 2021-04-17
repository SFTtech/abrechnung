import React, {Component} from "react";
import {connect} from "react-redux";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";

import {fetchAccounts, fetchTransactions} from "../../store/groupsSlice";
import TransactionLogItem from "./TransactionLogItem";
import Button from "react-bootstrap/cjs/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";
import PropTypes from "prop-types";
import Spinner from "react-bootstrap/Spinner";
import {LinkContainer} from "react-router-bootstrap";
import {withRouter} from "react-router-dom";


class TransactionLog extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };
    state = {};

    componentDidMount = () => {
        this.props.fetchTransactions({groupID: this.props.group.group_id});
        this.props.fetchAccounts({groupID: this.props.group.group_id});
    };

    render() {
        if (this.props.group.transactions === undefined) {
            return (
                <Row>
                    <Col xs={12}>
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    </Col>
                </Row>
            )
        }

        return (
            <Row>
                <Col xs={12}>
                    {this.props.group.transactions.length === 0 ? (
                        <span>No Transactions</span>
                    ) : (
                        this.props.group.transactions.map(transaction => {
                            return <TransactionLogItem group={this.props.group}
                                                       transaction={transaction}/>
                        }))}
                    <div className={"d-flex mt-3 justify-content-center"}>
                        <LinkContainer to={`${this.props.match.url}/new`}>
                            <Button variant={"outline-success"}><FontAwesomeIcon icon={faPlus}/></Button>
                        </LinkContainer>
                    </div>
                </Col>
            </Row>
        );
    }
}

export default withRouter(connect(null, {fetchTransactions, fetchAccounts})(TransactionLog));
