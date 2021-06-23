import React, {Suspense} from "react";
import {Redirect, Route, Switch, useRouteMatch} from "react-router-dom";
import InviteLinkList from "../../components/groups/InviteLinkList";
import GroupMemberList from "../../components/groups/GroupMemberList";
import GroupLog from "../../components/groups/GroupLog";
import GroupDetail from "../../components/groups/GroupDetail";
import Accounts from "../../components/groups/Accounts";
import Transaction from "./Transaction";
import CreateTransaction from "../../components/transactions/CreateTransaction";
import TransactionLog from "../../components/transactions/TransactionLog";
import {useRecoilValue} from "recoil";
import {groupById} from "../../recoil/groups";
import Layout from "../../components/style/Layout";
import Loading from "../../components/style/Loading";

export default function Group() {
    const match = useRouteMatch();
    const groupID = parseInt(match.params.id);
    const group = useRecoilValue(groupById(groupID));

    // TODO: handle 404
    return (
        <Layout group={group}>
            <Switch>
                <Route exact path={`${match.path}/`}>
                    <Redirect to={`${match.url}/transactions`}/>
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
        </Layout>
    );
}
