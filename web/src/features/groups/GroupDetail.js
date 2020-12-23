import React, { Component } from "react";
import { connect } from "react-redux";

import ListGroup from "react-bootstrap/cjs/ListGroup";
import "react-datetime/css/react-datetime.css";
import PropTypes from "prop-types";
import { fetchGroupMetadata, updateGroupMetadata } from "./groupsSlice";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/cjs/Alert";
import Col from "react-bootstrap/cjs/Col";
import EditableField from "../../components/EditableField";

class GroupDetail extends Component {
    static propTypes = {
        group: PropTypes.object.isRequired,
    };

    state = {};

    updateName = (name) => {
        this.props.updateGroupMetadata({ groupID: this.props.group.id, name: name });
    };

    updateDescription = (description) => {
        this.props.updateGroupMetadata({ groupID: this.props.group.id, description: description });
    };

    updateCurrency = (currency) => {
        this.props.updateGroupMetadata({ groupID: this.props.group.id, currency: currency });
    };

    updateTerms = (terms) => {
        this.props.updateGroupMetadata({ groupID: this.props.group.id, terms: terms });
    };

    componentDidMount = () => {
        this.props.fetchGroupMetadata({ groupID: this.props.group.id });
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
                <ListGroup variant={"flush"}>
                    <ListGroup.Item className={"d-flex"}>
                        <Col xs={3} className={"p-0"}>
                            <span className={"font-weight-bold"}>Name</span>
                        </Col>
                        <Col xs={9} className={"p-0 d-flex justify-content-between"}>
                            <EditableField value={this.props.group.name} onChange={this.updateName} />
                        </Col>
                    </ListGroup.Item>
                    <ListGroup.Item className={"d-flex"}>
                        <Col xs={3} className={"p-0"}>
                            <span className={"font-weight-bold"}>Description</span>
                        </Col>
                        <Col xs={9} className={"p-0 d-flex justify-content-between"}>
                            <EditableField value={this.props.group.description} onChange={this.updateDescription} />
                        </Col>
                    </ListGroup.Item>
                    <ListGroup.Item className={"d-flex"}>
                        <span className={"font-weight-bold w-25"}>Created</span>
                        <span>{this.props.group.created}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className={"d-flex"}>
                        <span className={"font-weight-bold w-25"}>Joined</span>
                        <span>{this.props.group.joined}</span>
                    </ListGroup.Item>
                    <ListGroup.Item className={"d-flex"}>
                        <span className={"font-weight-bold w-25"}>Last Changed</span>
                        <span>
                            {this.props.group.latest_commit === null ? "never" : this.props.group.latest_commit}
                        </span>
                    </ListGroup.Item>
                    {this.props.group.currency === undefined || this.props.group.terms === undefined ? (
                        <ListGroup.Item className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </ListGroup.Item>
                    ) : (
                        <>
                            <ListGroup.Item className={"d-flex"}>
                                <Col xs={3} className={"p-0"}>
                                    <span className={"font-weight-bold"}>Currency</span>
                                </Col>
                                <Col xs={9} className={"p-0 d-flex justify-content-between"}>
                                    <EditableField value={this.props.group.currency} onChange={this.updateCurrency} />
                                </Col>
                            </ListGroup.Item>
                            <ListGroup.Item>
                                <div className={"d-flex justify-content-between"}>
                                    <span className={"font-weight-bold"}>Terms</span>
                                    <EditableField
                                        type={"textarea"}
                                        value={this.props.group.terms}
                                        onChange={this.updateTerms}
                                    />
                                </div>
                            </ListGroup.Item>
                        </>
                    )}
                </ListGroup>
            </>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.groups.status,
    error: state.groups.error,
});

export default connect(mapStateToProps, { fetchGroupMetadata, updateGroupMetadata })(GroupDetail);
