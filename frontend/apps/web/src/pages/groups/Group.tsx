import React, { Suspense } from "react";
import { Route, Routes, Navigate, useParams } from "react-router-dom";
import GroupInvites from "./GroupInvites";
import GroupMemberList from "./GroupMemberList";
import GroupLog from "./GroupLog";
import TransactionList from "../../components/transactions/TransactionList";
import Layout from "../../components/style/Layout";
import Loading from "../../components/style/Loading";
import Transaction from "./Transaction";
import GroupSettings from "./GroupSettings";
import Balances from "../../components/accounts/Balances";
import { AccountList } from "../AccountList";
import { ClearingAccountList } from "../ClearingAccountList";
import { AccountDetail } from "../AccountDetail";
import { api, ws } from "../../core/api";
import {
    selectAccountSlice,
    selectGroupSlice,
    selectTransactionSlice,
    useAppDispatch,
    useAppSelector,
} from "../../store";
import {
    fetchAccounts,
    fetchGroupMembers,
    fetchTransactions,
    selectGroupAccountsStatus,
    selectGroupById,
    selectGroupExists,
    selectGroupMemberStatus,
    selectGroupTransactionsStatus,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import { batch } from "react-redux";
import { toast } from "react-toastify";

export const Group: React.FC = () => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const groupId = Number(params["id"]);
    const group = useAppSelector((state) => selectGroupById({ state: selectGroupSlice(state), groupId }));
    const groupExists = useAppSelector((state) => selectGroupExists({ state: selectGroupSlice(state), groupId }));
    const transactionStatus = useAppSelector((state) =>
        selectGroupTransactionsStatus({ state: selectTransactionSlice(state), groupId })
    );
    const accountStatus = useAppSelector((state) =>
        selectGroupAccountsStatus({ state: selectAccountSlice(state), groupId })
    );
    const groupMemberStatus = useAppSelector((state) =>
        selectGroupMemberStatus({ state: selectGroupSlice(state), groupId })
    );

    React.useEffect(() => {
        if (!groupExists) {
            return () => {
                // TODO: fixme
                return;
            };
        }
        dispatch(subscribe({ subscription: { type: "transaction", groupId }, websocket: ws }));
        dispatch(subscribe({ subscription: { type: "account", groupId }, websocket: ws }));
        dispatch(subscribe({ subscription: { type: "group_member", groupId }, websocket: ws }));

        return () => {
            dispatch(unsubscribe({ subscription: { type: "transaction", groupId }, websocket: ws }));
            dispatch(unsubscribe({ subscription: { type: "account", groupId }, websocket: ws }));
            dispatch(unsubscribe({ subscription: { type: "group_member", groupId }, websocket: ws }));
        };
    }, [dispatch, groupId, groupExists]);

    React.useEffect(() => {
        // TODO: make sure we only fetch once, especially when the group changes
        // TODO: possible remedy: special selector that only checks whether a group
        // id exists and does not return any group content
        if (groupExists) {
            batch(() => {
                Promise.all([
                    dispatch(fetchAccounts({ groupId, api })),
                    dispatch(fetchTransactions({ groupId, api })),
                    dispatch(fetchGroupMembers({ groupId, api })),
                ]).catch((err) => {
                    console.warn(err);
                    toast.error(`Error while loading transactions and accounts: ${err}`);
                });
            });
        }
    }, [groupExists, groupId, dispatch]);

    if (!groupExists) {
        console.error("did not find group, redirecting to 404");
        return <Navigate to="/404" />;
    }

    // TODO: handle 404
    return (
        <Layout groupId={groupId}>
            {accountStatus === undefined ||
            transactionStatus === undefined ||
            groupMemberStatus === undefined ||
            accountStatus === "loading" ||
            transactionStatus === "loading" ||
            groupMemberStatus === "loading" ? (
                <Loading />
            ) : (
                <Routes>
                    <Route path="log" element={<GroupLog groupId={groupId} />} />
                    <Route
                        path="accounts"
                        element={
                            <Suspense fallback={<Loading />}>
                                <AccountList groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="events"
                        element={
                            <Suspense fallback={<Loading />}>
                                <ClearingAccountList groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="members"
                        element={
                            <Suspense fallback={<Loading />}>
                                <GroupMemberList groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="detail"
                        element={
                            <Suspense fallback={<Loading />}>
                                <GroupSettings groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="invites"
                        element={
                            <Suspense fallback={<Loading />}>
                                <GroupInvites groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="balances"
                        element={
                            <Suspense fallback={<Loading />}>
                                <Balances groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="/"
                        element={
                            <Suspense fallback={<Loading />}>
                                <TransactionList groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="transactions/:id"
                        element={
                            <Suspense fallback={<Loading />}>
                                <Transaction groupId={groupId} />
                            </Suspense>
                        }
                    />
                    <Route
                        path="accounts/:id"
                        element={
                            <Suspense fallback={<Loading />}>
                                <AccountDetail groupId={group.id} />
                            </Suspense>
                        }
                    />
                </Routes>
            )}
        </Layout>
    );
};

export default Group;
