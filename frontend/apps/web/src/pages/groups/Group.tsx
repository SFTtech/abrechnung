import {
    fetchGroupDependencies,
    selectGroupAccountsStatus,
    selectGroupById,
    selectGroupExists,
    selectGroupMemberStatus,
    selectGroupTransactionsStatus,
    subscribe,
    unsubscribe,
} from "@abrechnung/redux";
import React, { Suspense } from "react";
import { batch } from "react-redux";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Balances } from "../accounts/Balances";
import { Loading } from "../../components/style/Loading";
import { api, ws } from "../../core/api";
import {
    selectAccountSlice,
    selectGroupSlice,
    selectTransactionSlice,
    useAppDispatch,
    useAppSelector,
} from "../../store";
import { AccountDetail } from "../accounts/AccountDetail";
import { PersonalAccountList } from "../accounts/PersonalAccountList";
import { ClearingAccountList } from "../accounts/ClearingAccountList";
import { TransactionList } from "../transactions/TransactionList";
import { SettlementPlanDisplay } from "../accounts/SettlementPlanDisplay";
import { GroupInvites } from "./GroupInvites";
import { GroupLog } from "./GroupLog";
import { GroupMemberList } from "./GroupMemberList";
import { GroupSettings } from "./GroupSettings";
import { TransactionDetail } from "../transactions/TransactionDetail";

export const Group: React.FC = () => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const groupId = Number(params["groupId"]);
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
        if (groupExists) {
            batch(() => {
                dispatch(fetchGroupDependencies({ groupId, api, fetchAnyway: true }))
                    .unwrap()
                    .catch((err) => {
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

    if (
        accountStatus === undefined ||
        transactionStatus === undefined ||
        groupMemberStatus === undefined ||
        accountStatus === "loading" ||
        transactionStatus === "loading" ||
        groupMemberStatus === "loading"
    ) {
        return <Loading />;
    }

    // TODO: handle 404
    return (
        <Routes>
            <Route path="log" element={<GroupLog groupId={groupId} />} />
            <Route
                path="accounts"
                element={
                    <Suspense fallback={<Loading />}>
                        <PersonalAccountList groupId={groupId} />
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
                path="settlement-plan"
                element={
                    <Suspense fallback={<Loading />}>
                        <SettlementPlanDisplay groupId={group.id} />
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
                        <TransactionDetail groupId={groupId} />
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
            <Route
                path="events/:id"
                element={
                    <Suspense fallback={<Loading />}>
                        <AccountDetail groupId={group.id} />
                    </Suspense>
                }
            />
        </Routes>
    );
};

export default Group;
