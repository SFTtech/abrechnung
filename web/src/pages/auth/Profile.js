import React from "react";
import {Route, Switch, useRouteMatch} from "react-router-dom";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tab from "react-bootstrap/Tab";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";

import SessionList from "../../components/auth/SessionList";
import ChangePassword from "../../components/auth/ChangePassword";
import ChangeEmail from "../../components/auth/ChangeEmail";
import "./Profile.css";
import {useRecoilValue} from "recoil";
import {userData} from "../../recoil/auth";
import Layout from "../../components/Layout";

export default function Profile() {
    const user = useRecoilValue(userData);
    const match = useRouteMatch();

    return (
        <Layout title="Profile" auth={true}>
            <Row>
                <Col xs={12}>
                    <h3>Profile</h3>
                    <hr/>
                    <Tab.Container
                        id="profile-tabs"
                        defaultActiveKey="user-info"
                        activeKey={match.params !== undefined ? match.params.tab : "user-info"}
                    >
                        <Row>
                            <Col lg={3} md={4}>
                                <ListGroup>
                                    <LinkContainer to={`${match.url}/user-info`}>
                                        <ListGroup.Item action>User Info</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={`${match.url}/sessions`}>
                                        <ListGroup.Item action>Sessions</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={`${match.url}/change-email`}>
                                        <ListGroup.Item action>Change E-Mail</ListGroup.Item>
                                    </LinkContainer>
                                    <LinkContainer to={`${match.url}/change-password`}>
                                        <ListGroup.Item action>Change Password</ListGroup.Item>
                                    </LinkContainer>
                                </ListGroup>
                            </Col>
                            <Col lg={9} md={8}>
                                <Switch>
                                    <Route exact path={`${match.path}/(user-info)?`}>
                                        <ListGroup variant={"flush"}>
                                            <ListGroup.Item className={"d-flex"}>
                                                <span className={"font-weight-bold w-25"}>Username</span>
                                                <span>{user.username}</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className={"d-flex"}>
                                                <span className={"font-weight-bold w-25"}>E-Mail</span>
                                                <span>{user.email}</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className={"d-flex"}>
                                                <span className={"font-weight-bold w-25"}>Language</span>
                                                <span>{user.language}</span>
                                            </ListGroup.Item>
                                            <ListGroup.Item className={"d-flex"}>
                                                <span className={"font-weight-bold w-25"}>Registered</span>
                                                <span>{user.registered_at}</span>
                                            </ListGroup.Item>
                                        </ListGroup>
                                    </Route>
                                    <Route exact path={`${match.path}/sessions`}>
                                        <SessionList/>
                                    </Route>
                                    <Route exact path={`${match.path}/change-email`}>
                                        <ChangeEmail/>
                                    </Route>
                                    <Route exact path={`${match.path}/change-password`}>
                                        <ChangePassword/>
                                    </Route>
                                </Switch>
                            </Col>
                        </Row>
                    </Tab.Container>
                </Col>
            </Row>
        </Layout>
    );
}

