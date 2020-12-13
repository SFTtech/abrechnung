import React, { Component } from "react";
import { connect } from "react-redux";
import { withRouter } from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import Spinner from "react-bootstrap/Spinner";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import Card from "react-bootstrap/cjs/Card";
import "react-datetime/css/react-datetime.css";
import InviteLinkList from "./InviteLinkList";

import { fetchGroups } from "./usersSlice";

class GroupDetail extends Component {
    state = {};

    componentDidMount = () => {
        if (this.props.groups === null) {
            this.props.fetchGroups();
        }
    };

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";

        // we need parseInt here since the props param is a string
        const group =
            this.props.groups === null
                ? null
                : this.props.groups.find((group) => group.id === parseInt(this.props.match.params.id));

        return (
            <Row>
                <Col xs={12}>
                    <h3>Groups</h3>
                    {error}
                    <hr />
                    {group === null ? (
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    ) : (
                        <Row>
                            <Col md={7} xs={12}>
                                <span>asdf</span>
                                <span>Detail for group with id {this.props.match.params.id}</span>
                            </Col>
                            <Col md={5} xs={12}>
                                <Card>
                                    <Card.Body>
                                        <h5>Members</h5>
                                        <hr />
                                        <ListGroup variant={"flush"}>
                                            <ListGroup.Item>Member 1</ListGroup.Item>
                                            <ListGroup.Item>Member 2</ListGroup.Item>
                                        </ListGroup>
                                    </Card.Body>
                                </Card>
                                <InviteLinkList group={group} />
                            </Col>
                        </Row>
                    )}
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.users.status,
    error: state.users.error,
    groups: state.users.groups,
});

export default withRouter(connect(mapStateToProps, { fetchGroups })(GroupDetail));
