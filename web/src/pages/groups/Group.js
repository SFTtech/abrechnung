import React, { Suspense } from "react";
import { Route, Switch, useRouteMatch } from "react-router-dom";
import GroupInvites from "./GroupInvites";
import GroupMemberList from "./GroupMemberList";
import GroupLog from "./GroupLog";
import TransactionList from "../../components/transactions/TransactionList";
import { useRecoilValue } from "recoil";
import { groupById } from "../../recoil/groups";
import Layout from "../../components/style/Layout";
import Loading from "../../components/style/Loading";
import Transaction from "./Transaction";
import GroupDetail from "./GroupDetail";
import Balances from "../../components/accounts/Balances";
import AccountList from "./AccountList";
import AccountDetail from "./AccountDetail";

export default function Group() {
    const match = useRouteMatch();
    const groupID = match.params.id;
    const group = useRecoilValue(groupById(parseInt(groupID)));

    // TODO: handle 404
    return (
        <Layout group={group}>
            <Switch>
                <Route exact path={`${match.path}/log`}>
                    <GroupLog group={group} />
                </Route>
                <Route exact path={`${match.path}/accounts`}>
                    <Suspense fallback={<Loading />}>
                        <AccountList group={group} />
                    </Suspense>
                </Route>
                <Route exact path={`${match.path}/members`}>
                    <Suspense fallback={<Loading />}>
                        <GroupMemberList group={group} />
                    </Suspense>
                </Route>
                <Route exact path={`${match.path}/detail`}>
                    <Suspense fallback={<Loading />}>
                        <GroupDetail group={group} />
                    </Suspense>
                </Route>
                <Route exact path={`${match.path}/invites`}>
                    <Suspense fallback={<Loading />}>
                        <GroupInvites group={group} />
                    </Suspense>
                </Route>
                <Route exact path={`${match.path}/balances`}>
                    <Suspense fallback={<Loading />}>
                        <Balances group={group} />
                    </Suspense>
                </Route>
                <Route exact path={`${match.path}/`}>
                    <Suspense fallback={<Loading />}>
                        <TransactionList group={group} />
                    </Suspense>
                </Route>
                <Route path={`${match.path}/transactions/:id([0-9]+)`}>
                    <Suspense fallback={<Loading />}>
                        <Transaction group={group} />
                    </Suspense>
                </Route>
                <Route path={`${match.path}/accounts/:id([0-9]+)`}>
                    <Suspense fallback={<Loading />}>
                        <AccountDetail group={group} />
                    </Suspense>
                </Route>
            </Switch>
        </Layout>
    );
}
