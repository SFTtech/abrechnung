import React, {Component} from "react";
import ListGroup from "react-bootstrap/ListGroup";
import Button from "react-bootstrap/cjs/Button";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";
import {faPlus} from "@fortawesome/free-solid-svg-icons/faPlus";
import AccountSelect from "../../components/AccountSelect";
import {InputGroup} from "react-bootstrap";
import Form from "react-bootstrap/cjs/Form";
import {faCheck} from "@fortawesome/free-solid-svg-icons/faCheck";
import {faTimes} from "@fortawesome/free-solid-svg-icons/faTimes";


class TransactionShares extends Component {
    state = {
        addNewItem: false,
        newAccountID: null,
        newShare: null,
    };

    startAdding = () => {
        this.setState({addNewItem: true});
    }

    stopAdding = () => {
        this.setState({addNewItem: false, newAccountID: null, newShare: null})
    }

    saveNewItem = () => {

    }

    render() {
        return (
            <div>
                <ListGroup className={"mb-2"} variant={"flush"}>
                    <ListGroup.Item>
                        <span>milo - 1</span>
                    </ListGroup.Item>
                    <ListGroup.Item>
                        <span>jj - 2</span>
                    </ListGroup.Item>
                </ListGroup>
                {this.state.addNewItem ? (
                    <InputGroup>
                        <AccountSelect value={this.state.newAccountID}
                                       placeholder={"account"}
                                       onChange={(accountID) => this.setState({newAccountID: accountID})}/>
                        <Form.Control className={"account-select-container"} type={"text"} as={"input"}
                                      value={this.state.newShare}
                                      placeholder={"share"}
                                      onChange={(event) => this.setState({newShare: event.target.value})}/>
                        <InputGroup.Append>
                            <Button
                                variant={"outline-success"}
                                onClick={this.saveNewItem}
                            >
                                <FontAwesomeIcon icon={faCheck}/>
                            </Button>
                        </InputGroup.Append>
                        <InputGroup.Append>
                            <Button
                                variant={"outline-danger"}
                                onClick={this.stopAdding}
                            >
                                <FontAwesomeIcon icon={faTimes}/>
                            </Button>
                        </InputGroup.Append>
                    </InputGroup>
                ) : (
                    <div className={"d-flex mt-2 justify-content-center"}>
                        <Button variant={"success"} onClick={this.startAdding}><FontAwesomeIcon icon={faPlus}/></Button>
                    </div>
                )}
            </div>
        );
    }
}


export default TransactionShares;
