import React, {Suspense} from "react";
import {Redirect, Route, Switch, useRouteMatch} from "react-router-dom";

import Row from "react-bootstrap/cjs/Row";
import Col from "react-bootstrap/cjs/Col";
import "react-datetime/css/react-datetime.css";
import InviteLinkList from "../components/groups/InviteLinkList";
import GroupMemberList from "../components/groups/GroupMemberList";
import ListGroup from "react-bootstrap/cjs/ListGroup";
import {LinkContainer} from "react-router-bootstrap";
import GroupLog from "../components/groups/GroupLog";
import GroupDetail from "../components/groups/GroupDetail";
import TransactionLog from "../components/transactions/TransactionLog";
import Accounts from "../components/groups/Accounts";
import Transaction from "./Transaction";
import CreateTransaction from "../components/transactions/CreateTransaction";
import {useRecoilValue} from "recoil";
import {groupById} from "../recoil/groups";
import Layout from "../components/Layout";
import Loading from "../components/Loading";

export default function Group() {
    const match = useRouteMatch();
    const groupID = parseInt(match.params.id);
    const group = useRecoilValue(groupById(groupID));

    // TODO: handle 404
    return (
        <Layout title={group.description}>
            <Row>
                <Col xs={12}>
                    <Row>
                        <Col lg={9} md={8}>
                            <Switch>
                                <Route exact path={`${match.path}/`}>
                                    <Suspense fallback={<Loading/>}>
                                        <Redirect to={`${match.url}/transactions`}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/transactions`}>
                                    <Suspense fallback={<Loading/>}>
                                        <TransactionLog group={group}/>
                                    </Suspense>
                                </Route>
                                <Route path={`${match.path}/transactions/new`}>
                                    <Suspense fallback={<Loading/>}>
                                        <CreateTransaction group={group}/>
                                    </Suspense>
                                </Route>
                                <Route path={`${match.path}/transactions/:id([0-9]+)`}>
                                    <Suspense fallback={<Loading/>}>
                                        <Transaction group={group}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/accounts`}>
                                    <Suspense fallback={<Loading/>}>
                                        <Accounts group={group}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/group-detail`}>
                                    <Suspense fallback={<Loading/>}>
                                        <GroupDetail group={group}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/invite-tokens`}>
                                    <Suspense fallback={<Loading/>}>
                                        <InviteLinkList group={group}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/log`}>
                                    <Suspense fallback={<Loading/>}>
                                        <GroupLog group={group}/>
                                    </Suspense>
                                </Route>
                                <Route exact path={`${match.path}/members`}>
                                    <Suspense fallback={<Loading/>}>
                                        <GroupMemberList group={group}/>
                                    </Suspense>
                                </Route>
                            </Switch>
                        </Col>
                        <Col lg={3} md={4}>
                            <ListGroup>
                                <LinkContainer to={`${match.url}/transactions`}>
                                    <ListGroup.Item action>Transactions</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${match.url}/accounts`}>
                                    <ListGroup.Item action>Accounts</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${match.url}/group-detail`}>
                                    <ListGroup.Item action>Group Detail</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${match.url}/members`}>
                                    <ListGroup.Item action>Members</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${match.url}/log`}>
                                    <ListGroup.Item action>Log</ListGroup.Item>
                                </LinkContainer>
                                <LinkContainer to={`${match.url}/invite-tokens`}>
                                    <ListGroup.Item action>Invite Links</ListGroup.Item>
                                </LinkContainer>
                            </ListGroup>
                        </Col>
                    </Row>
                </Col>
            </Row>
        </Layout>
    );
}
