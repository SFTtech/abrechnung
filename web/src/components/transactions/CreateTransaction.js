import React from "react";
import {Redirect} from "react-router-dom";
import Col from "react-bootstrap/cjs/Col";
import Button from "react-bootstrap/cjs/Button";
import Form from "react-bootstrap/cjs/Form";
import Row from "react-bootstrap/Row";
import {ws} from "../../websocket";


export default function CreateTransaction({group}) {
    const state = {
        currencySymbol: '€',
        currencyConversionRate: 1.0,
        value: 0,
        description: '',
        type: 'purchase',
        error: null,
        redirectToTransaction: null,
    };

    const save = () => {
        // TODO: form field validation
        ws.call("transaction_create", {
            authtoken: this.props.sessionToken,
            group_id: this.props.group.group_id,
            type: this.state.type,
            description: this.state.description,
            currency_symbol: this.state.currencySymbol,
            currency_conversion_rate: this.state.currencyConversionRate,
            value: parseFloat(this.state.value),
        }).then(value => {
            const result = value[0];
            this.props.createTransaction({
                groupID: this.props.group.group_id,
                transaction: {
                    transaction_id: result.transaction_id,
                    type: this.state.type,
                    history: [
                        {
                            revision_id: result.revision_id,
                            currency_symbol: this.state.currencySymbol,
                            currency_conversion_rate: this.state.currencyConversionRate,
                            value: this.state.value,
                        }
                    ]
                },
                revision: {
                    revision_id: result.revision_id,
                    commited: null,
                    started: result.revision_started,
                    user_id: result.revision_user_id
                }
            })
            this.setState({error: null, redirectToTransaction: result.transaction_id});
            // TODO: redirect to transaction page
        })
            .catch(error => {
                console.log("transaction create error:", error);
                this.setState({error: error});
            });

    }

    if (this.state.redirectToTransaction !== null
        && this.props.group.transactions.filter(t => t.transaction_id === this.state.redirectToTransaction).length > 0) {
        return <Redirect
            to={`/groups/${this.props.group.group_id}/transactions/${this.state.redirectToTransaction}`}/>;
    }

    return (
        <>
            <Row>
                <Col xs={12}>
                    {/*{this.state.error !== null ? <div className="alert alert-danger">{this.state.error}</div> : ""}*/}
                    <Form.Group controlId={"formDescription"}>
                        <Form.Label>Description</Form.Label>
                        <Form.Control value={this.state.description}
                                      onChange={(event) => this.setState({description: event.target.value})}/>
                    </Form.Group>

                    <Form.Group controlId={"formType"}>
                        <Form.Label>Transaction Type</Form.Label>
                        <Form.Control as={"select"} value={this.state.type}
                                      onChange={(event) => this.setState({type: event.target.value})} custom>
                            <option>purchase</option>
                            <option>transfer</option>
                            <option>mimo</option>
                        </Form.Control>
                    </Form.Group>

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

                    <Form.Group controlId={"formCurrencyConversionRate"}>
                        <Form.Label>Currency Conversion Rate to {this.props.group.currencySymbol}</Form.Label>
                        <Form.Control value={this.state.currencyConversionRate}
                                      onChange={(event) => this.setState({currencyConversionRate: event.target.value})}/>
                    </Form.Group>
                </Col>
            </Row>
            <Button onClick={this.save} variant={"outline-success"}>Save</Button>
        </>
    );
}
