import React, {Component} from "react";
import {connect} from "react-redux";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import {fetchGroupMetadata, updateGroupMetadata} from "../../store/groupsSlice";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/cjs/Alert";
import EditableField from "../../components/EditableField";

import "./GroupDetail.css";

class GroupDetail extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {};

    updateName = (name) => {
        this.props.updateGroupMetadata({groupID: this.props.group.group_id, name: name});
    };

    updateDescription = (description) => {
        this.props.updateGroupMetadata({groupID: this.props.group.group_id, description: description});
    };

    updateCurrencySymbol = (currency_symbol) => {
        this.props.updateGroupMetadata({groupID: this.props.group.group_id, currency_symbol: currency_symbol});
    };

    updateTerms = (terms) => {
        this.props.updateGroupMetadata({groupID: this.props.group.group_id, terms: terms});
    };

    componentDidMount = () => {
        this.props.fetchGroupMetadata({groupID: this.props.group.group_id});
    };

    render() {
        return (
            <>
                {this.props.group.is_owner ? (
                    <Alert variant={"info"}>You are an owner of this group</Alert>
                ) : !this.props.group.can_write ? (
                    <Alert variant={"info"}>You only have read access to this group</Alert>
                ) : (
                    ""
                )}
                <span className={"font-weight-bold"}>Name</span>
                <div className={"p-0 d-flex justify-content-between"}>
                    <EditableField value={this.props.group.name} onChange={this.updateName}/>
                </div>

                <span className={"font-weight-bold"}>Description</span>
                <div className={"p-0 d-flex justify-content-between"}>
                    <EditableField value={this.props.group.description} onChange={this.updateDescription}/>
                </div>

                <span className={"font-weight-bold"}>Created</span><br/>
                <span className={"info-text"}>{this.props.group.created}</span><br/>

                <span className={"font-weight-bold"}>Joined</span><br/>
                <span className={"info-text"}>{this.props.group.joined}</span><br/>

                <span className={"font-weight-bold"}>Last Changed</span><br/>
                <span className={"info-text"}>
                    {this.props.group.latest_commit === null ? "never" : this.props.group.latest_commit}
                </span><br/>

                {this.props.group.currency_symbol === undefined || this.props.group.terms === undefined ? (
                    <div className={"d-flex justify-content-center"}>
                        <Spinner animation="border" role="status">
                            <span className="sr-only">Loading...</span>
                        </Spinner>
                    </div>
                ) : (
                    <>
                        <span className={"font-weight-bold"}>Currency Symbol</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField value={this.props.group.currency_symbol}
                                           onChange={this.updateCurrencySymbol}/>
                        </div>

                        <span className={"font-weight-bold"}>Terms</span>
                        <div className={"d-flex justify-content-between"}>
                            <EditableField
                                type={"textarea"}
                                value={this.props.group.terms}
                                onChange={this.updateTerms}
                            />
                        </div>
                    </>
                )}
            </>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.groups.status,
    error: state.groups.error,
});

export default connect(mapStateToProps, {fetchGroupMetadata, updateGroupMetadata})(GroupDetail);
