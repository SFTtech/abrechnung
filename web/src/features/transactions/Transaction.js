import React, {Component} from "react";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import PurchaseItems from "./purchase/PurchaseItems";
import Row from "react-bootstrap/Row";
import TransactionShares from "./TransactionShares";
import EditableField from "../../components/EditableField";
import EditableAccountSelect from "../../components/EditableAccountSelect";
import PropTypes from "prop-types";


class Transaction extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };
    state = {};

    getTransaction = () => {
        // we need parseInt here since the props param is a string
        return this.props.group.transactions[parseInt(this.props.match.params.id)];
    };

    render() {
        const transaction = this.getTransaction();


        return (
            <>
                <h4>{transaction.description}</h4>
                <Row>
                    <Col xs={12} md={6}>
                        <span className={"font-weight-bold"}>Value</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField value={transaction.value} onChange={this.onTransactionValueChange}/>
                        </div>
                        <span className={"font-weight-bold"}>Currency</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField value={transaction.currency_symbol}
                                           onChange={this.onTransactionCurrencyChange}/>
                        </div>
                        <span className={"font-weight-bold"}>Paid</span>
                        <div className={"d-flex justify-content-between"} >
                            <EditableAccountSelect group={this.props.group} onChange={(accountID) => console.log(accountID)}/>
                        </div>
                    </Col>
                    <Col xs={12} md={6}>
                        <h5>Transaction Shares</h5>
                        <TransactionShares group={this.props.group} transaction={transaction}/>
                    </Col>
                </Row>

                <hr/>
                <h5>Items</h5>
                <PurchaseItems group={this.props.group} transaction={transaction}/>
                <Button variant={"outline-success"}>Save</Button>
            </>
        );
    }
}

export default withRouter(connect(null, null)(Transaction));
