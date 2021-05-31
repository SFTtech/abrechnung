import React, {Component} from "react";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Row from "react-bootstrap/Row";
import TransactionShares from "./TransactionDebitorShares";
import EditableField from "../EditableField";
import EditableAccountSelect from "../EditableAccountSelect";
import PropTypes from "prop-types";


class TransactionEdit extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
        transaction: PropTypes.object.isRequired,
    };

    render() {

        return (
            <>
                <h4>{this.props.transaction.description}</h4>
                <Button variant={"outline-success"}>Save</Button>
                <Row>
                    <Col xs={12} md={6}>
                        <span className={"font-weight-bold"}>Value</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField value={this.props.transaction.value}
                                           onChange={this.onTransactionValueChange}/>
                        </div>
                        <span className={"font-weight-bold"}>Currency</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField value={this.props.transaction.currency_symbol}
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
                        <TransactionShares group={this.props.group} transaction={this.props.transaction}/>
                    </Col>
                </Row>

                {/*<hr/>*/}
                {/*<h5>Items</h5>*/}
                {/*<PurchaseItems group={this.props.group} transaction={transaction}/>*/}
            </>
        );
    }
}

export default TransactionEdit;
