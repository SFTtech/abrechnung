import React, {Component} from "react";
import {connect} from "react-redux";
import {Switch, withRouter} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import Spinner from "react-bootstrap/Spinner";
import "react-datetime/css/react-datetime.css";
import InviteLinkList from "./InviteLinkList";

import {fetchGroups} from "./groupsSlice";
import GroupMemberList from "./GroupMemberList";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";
import GroupLog from "./GroupLog";
import GroupDetail from "./GroupDetail";
import PrivateRoute from "../../components/PrivateRoute";
import TransactionLog from "../transactions/TransactionLog";
import Accounts from "../transactions/Accounts";

class Group extends Component {
    state = {};

    componentDidMount = () => {
        this.props.fetchGroups();
    };

    getGroup = () => {
        // we need parseInt here since the props param is a string
        return this.props.groups[parseInt(this.props.match.params.id)];
    };

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";
        const group = this.getGroup();

        if (group === undefined) {
            return (
                <Row>
                    <Col xs={12}>
                        <div className={"d-flex justify-content-center"}>
                            <Spinner animation="border" role="status">
                                <span className="sr-only">Loading...</span>
                            </Spinner>
                        </div>
                    </Col>
                </Row>
            );
        }

        const path = this.props.match.path;
        const url = this.props.match.url;

        return (
            <Row>
                <Col xs={12}>
                    <h3>{group.name}</h3>
                    {error}
                    <hr/>
                    <Row>
                        <Col lg={9} md={8}>
                            <Switch>
                                <PrivateRoute exact path={`${path}/(transactions)?`}>
                                    <TransactionLog group={group}/>
                                </PrivateRoute>
                                <PrivateRoute exact path={`${path}/accounts`}>
                                    <Accounts group={group}/>
                                </PrivateRoute>
                                <PrivateRoute exact path={`${path}/group-detail`}>
                                    <GroupDetail group={group}/>
                                </PrivateRoute>
                                <PrivateRoute exact path={`${path}/invite-tokens`}>
                                    <InviteLinkList group={group}/>
                                </PrivateRoute>
                                <PrivateRoute exact path={`${path}/log`}>
                                    <GroupLog group={group}/>
                                </PrivateRoute>
                                <PrivateRoute exact path={`${path}/members`}>
                                    <GroupMemberList group={group}/>
                                </PrivateRoute>
                            </Switch>
                        </Col>
                        <Col lg={3} md={4}>
                            <ListGroup>
                                <LinkContainer to={`${url}/transactions`}>
                                    <ListGroup.Item action>Transactions</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${url}/accounts`}>
                                    <ListGroup.Item action>Accounts</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${url}/group-detail`}>
                                    <ListGroup.Item action>Group Detail</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${url}/members`}>
                                    <ListGroup.Item action>Members</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${url}/log`}>
                                    <ListGroup.Item action>Log</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${url}/invite-tokens`}>
                                    <ListGroup.Item action>Invite Links</ListGroup.Item>
                                </LinkContainer>
                            </ListGroup>
                        </Col>
                    </Row>
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    status: state.groups.status,
    error: state.groups.error,
    groups: state.groups.entities,
});

export default withRouter(connect(mapStateToProps, {fetchGroups})(Group));
