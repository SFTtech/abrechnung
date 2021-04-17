import React, {Component} from "react";
import {connect} from "react-redux";
import {withRouter} from "react-router-dom";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Form from "react-bootstrap/cjs/Form";
import Row from "react-bootstrap/Row";
import PropTypes from "prop-types";
import {createTransaction} from "../../store/groupsSlice";
import AccountSelect from "../../components/AccountSelect";


class CreateTransaction extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };
    state = {
        currencySymbol: '',
        currencyConversionRate: 1.0,
        value: 0,
        description: '',
        type: 'purchase'
    };

    save = () => {
        this.props.createTransaction({
            groupID: this.props.group.id,
            currencySymbol: this.state.currencySymbol,
            currencyConversionRate: this.state.currencyConversionRate,
            value: this.state.value,
            description: this.state.description,
            type: this.state.type
        });
    }

    render() {

        return (
            <>
                <Row>
                    <Col xs={12}>
                        <Form.Group controlId={"formValue"}>
                            <Form.Label>Value</Form.Label>
                            <Form.Control value={this.state.value}
                                          onChange={(event) => this.setState({value: event.target.value})}/>
                        </Form.Group>

                        <Form.Group controlId={"formCurrencySymbol"}>
                            <Form.Label>Currency</Form.Label>
                            <Form.Control value={this.state.currencySymbol}
                                          onChange={(event) => this.setState({currencySymbol: event.target.value})}/>
                        </Form.Group>

                        <Form.Group controlId={"formDescription"}>
                            <Form.Label>Description</Form.Label>
                            <Form.Control value={this.state.description}
                                          onChange={(event) => this.setState({description: event.target.value})}/>
                        </Form.Group>

                        <Form.Group controlId={"formPaidFor"}>
                            <Form.Label>Paid for by</Form.Label>
                            <AccountSelect group={this.props.group} onChange={(accountID) => console.log(accountID)}/>
                        </Form.Group>
                    </Col>
                </Row>
                <Button onClick={this.save} variant={"outline-success"}>Save</Button>
            </>
        );
    }
}

export default withRouter(connect(null, {createTransaction})(CreateTransaction));
