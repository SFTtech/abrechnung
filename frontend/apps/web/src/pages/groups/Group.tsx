import React, { Suspense } from "react";
import { Route, Routes, useNavigate, useParams } from "react-router-dom";
import GroupInvites from "./GroupInvites";
import GroupMemberList from "./GroupMemberList";
import GroupLog from "./GroupLog";
import TransactionList from "../../components/transactions/TransactionList";
import { useRecoilValue } from "recoil";
import { groupById } from "../../state/groups";
import Layout from "../../components/style/Layout";
import Loading from "../../components/style/Loading";
import Transaction from "./Transaction";
import GroupSettings from "./GroupSettings";
import Balances from "../../components/accounts/Balances";
import AccountList from "../account-list/AccountList";
import AccountDetail from "../AccountDetail";

export const Group: React.FC = () => {
    const params = useParams();
    const navigate = useNavigate();
    const groupID = params["id"];
    const group = useRecoilValue(groupById(parseInt(groupID)));

    if (group === undefined) {
        navigate("/404");
        return null;
    }

    // TODO: handle 404
    return (
        <Layout group={group}>
            <Routes>
                <Route path="log" element={<GroupLog group={group} />} />
                <Route
                    path="accounts"
                    element={
                        <Suspense fallback={<Loading />}>
                            <AccountList group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="members"
                    element={
                        <Suspense fallback={<Loading />}>
                            <GroupMemberList group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="detail"
                    element={
                        <Suspense fallback={<Loading />}>
                            <GroupSettings group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="invites"
                    element={
                        <Suspense fallback={<Loading />}>
                            <GroupInvites group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="balances"
                    element={
                        <Suspense fallback={<Loading />}>
                            <Balances group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="/"
                    element={
                        <Suspense fallback={<Loading />}>
                            <TransactionList group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="transactions/:id"
                    element={
                        <Suspense fallback={<Loading />}>
                            <Transaction group={group} />
                        </Suspense>
                    }
                />
                <Route
                    path="accounts/:id"
                    element={
                        <Suspense fallback={<Loading />}>
                            <AccountDetail group={group} />
                        </Suspense>
                    }
                />
            </Routes>
        </Layout>
    );
};

export default Group;
