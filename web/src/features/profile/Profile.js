import React, { Component } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import { withRouter } from "react-router-dom";
import { fetchUserInfo } from "../auth/authSlice";
import ChangePassword from "./ChangePassword";
import ChangeEmail from "./ChangeEmail";
import Spinner from "react-bootstrap/Spinner";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tab from "react-bootstrap/Tab";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import { LinkContainer } from "react-router-bootstrap";

import SessionList from "./SessionList";
import "./Profile.css";

class Profile extends Component {
    static propTypes = {
        user: PropTypes.object,
        error: PropTypes.object,
        isLoading: PropTypes.bool.isRequired,
        fetchUserInfo: PropTypes.func.isRequired,
    };

    componentDidMount = () => {
        if (this.props.user === null) {
            this.props.fetchUserInfo();
        }
    };

    render() {
        const error = this.props.error !== null ? <div className="alert alert-danger">{this.props.error}</div> : "";

        return (
            <Row>
                <Col xs={12}>
                    <h3>Profile</h3>
                    {error}
                    <hr />
                    <Tab.Container
                        id="profile-tabs"
                        defaultActiveKey="user-info"
                        activeKey={this.props.match.params !== undefined ? this.props.match.params.tab : "user-info"}
                    >
                        <Row>
                            <Col lg={3} md={4}>
                                <ListGroup>
                                    <LinkContainer to={"/profile/user-info"}>
                                        <ListGroup.Item action>User Info</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/sessions"}>
                                        <ListGroup.Item action>Sessions</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/change-email"}>
                                        <ListGroup.Item action>Change E-Mail</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={"/profile/change-password"}>
                                        <ListGroup.Item action>Change Password</ListGroup.Item>
                                    </LinkContainer>
                                </ListGroup>
                            </Col>
                            <Col lg={9} md={8}>
                                <Tab.Content>
                                    <Tab.Pane eventKey="user-info">
                                        {this.props.isLoading || this.props.user === null ? (
                                            <div className={"d-flex justify-content-center"}>
                                                <Spinner animation="border" role="status">
                                                    <span className="sr-only">Loading...</span>
                                                </Spinner>
                                            </div>
                                        ) : (
                                            <ListGroup variant={"flush"}>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Username</span>
                                                    <span>{this.props.user.username}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>E-Mail</span>
                                                    <span>{this.props.user.email}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Language</span>
                                                    <span>{this.props.user.language}</span>
                                                </ListGroup.Item>
                                                <ListGroup.Item className={"d-flex"}>
                                                    <span className={"font-weight-bold w-25"}>Registered</span>
                                                    <span>{this.props.user.registered_at}</span>
                                                </ListGroup.Item>
                                            </ListGroup>
                                        )}
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="sessions">
                                        <SessionList />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="change-email">
                                        <ChangeEmail />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="change-password">
                                        <ChangePassword />
                                    </Tab.Pane>
                                </Tab.Content>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Col>
            </Row>
        );
    }
}

const mapStateToProps = (state) => ({
    user: state.auth.user,
    error: state.profile.error,
    isLoading: state.profile.status === "loading",
});

export default withRouter(
    connect(mapStateToProps, {
        fetchUserInfo,
    })(Profile)
);
