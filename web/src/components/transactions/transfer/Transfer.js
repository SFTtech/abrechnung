import React from "react";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Row from "react-bootstrap/Row";
import TransactionShares from "../TransactionDebitorShares";
import EditableField from "../../style/EditableField";
import EditableAccountSelect from "../../style/EditableAccountSelect";


export default function Transaction({group, transaction}) {
    const state = {
        loading: true,
    };

    const current_history = this.props.transaction.history[this.props.transaction.history.length - 1];

    return (
        <>
            <h4>{current_history.description}</h4>
            <Row>
                <Col xs={12} md={6}>
                    <span className={"font-weight-bold"}>Value</span>
                    <div className={"d-flex justify-content-between"}>
                        <EditableField value={current_history.value} onChange={this.onTransactionValueChange}/>
                    </div>
                    <span className={"font-weight-bold"}>Currency</span>
                    <div className={"d-flex justify-content-between"}>
                        <EditableField value={current_history.currency_symbol}
                                       onChange={this.onTransactionCurrencyChange}/>
                    </div>
                    <span className={"font-weight-bold"}>Paid</span>
                    <div className={"d-flex justify-content-between"}>
                        <EditableAccountSelect group={this.props.group}
                                               onChange={(accountID) => console.log(accountID)}/>
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
