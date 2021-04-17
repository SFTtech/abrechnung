import React, {Component} from "react";
import {connect} from "react-redux";
import Form from "react-bootstrap/cjs/Form";
import PropTypes from "prop-types";

import "./AccountSelect.css";
import {fetchAccounts} from "../store/groupsSlice";
import Spinner from "react-bootstrap/Spinner";


class AccountSelect extends Component {
    static propTypes = {
        onChange: PropTypes.func.isRequired,
        placeholder: PropTypes.string,
        group: PropTypes.object.isRequired,
    };

    state = {
        value: "",
        selectedAccountID: -1,
        showDropdown: false,
    };

    componentDidMount = () => {
        this.props.fetchAccounts({groupID: this.props.group.group_id});
    }

    onChange = (event) => {
        this.setState({value: event.target.value, showDropdown: true});
    };

    onFocus = () => {
        // this.setState({showDropdown: true});
    };

    getFilteredAccounts = () => {
        return this.props.group.accounts.filter(account => account.name.includes(this.state.value));
    };

    onSelect = (accountID) => {
        const account = this.props.group.accounts.find((account) => account.account_id === accountID);
        if (account !== undefined) {
            this.setState({
                selectedAccountID: account.account_id,
                value: account.name,
                showDropdown: false
            });
            this.props.onChange(accountID);
        } else {
            this.setState({selectedAccountID: -1});
        }
    };

    render() {
        // TODO: implement max height for dropdown with scrolling

        return (
            <>
                <Form.Control className={"account-select-container"}
                              type={"text"}
                              as={"input"}
                              onFocus={this.onFocus()}
                              value={this.state.value}
                              placeholder={this.props.placeholder}
                              onChange={this.onChange}/>
                {this.state.showDropdown ? (
                    <div className={"account-select-dropdown shadow"}>
                        <div className={"list-group"}>
                            {this.props.group.accounts === undefined ? (
                                <div className={"d-flex justify-content-center"}>
                                    <Spinner animation="border" role="status">
                                        <span className="sr-only">Loading...</span>
                                    </Spinner>
                                </div>
                            ) : (
                                this.getFilteredAccounts().map(account => {
                                    return (
                                        <div className="list-item" key={account.account_id}
                                             onClick={() => this.onSelect(account.account_id)}>{account.name}</div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                ) : ""}
            </>
        );
    };
}

export default connect(null, {fetchAccounts})(AccountSelect);