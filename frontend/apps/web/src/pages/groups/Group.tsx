import {
    fetchGroupDependencies,
    selectGroupAccountsStatus,
    selectGroupMemberStatus,
    selectGroupTransactionsStatus,
    subscribe,
    unsubscribe,
    useGroup,
} from "@abrechnung/redux";
import React, { Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router";
import { toast } from "react-toastify";
import { Balances } from "../accounts/Balances";
import { Loading } from "@abrechnung/components";
import { api, ws } from "@/core/api";
import { useAppDispatch, useAppSelector } from "@/store";
import { AccountDetail } from "../accounts/AccountDetail";
import { PersonalAccountList } from "../accounts/PersonalAccountList";
import { ClearingAccountList } from "../accounts/ClearingAccountList";
import { TransactionList } from "../transactions/TransactionList";
import { SettlementPlanDisplay } from "../accounts/SettlementPlanDisplay";
import { GroupActivity } from "./GroupActivity";
import { GroupSettingsPage } from "./settings";
import { TransactionDetail } from "../transactions/TransactionDetail";
import { SerializedError } from "@reduxjs/toolkit";

export const Group: React.FC = () => {
    const params = useParams();
    const dispatch = useAppDispatch();
    const groupId = Number(params["groupId"]);
    const group = useGroup(groupId);
    const groupExists = group !== undefined;
    const transactionStatus = useAppSelector((state) => selectGroupTransactionsStatus(state, groupId));
    const accountStatus = useAppSelector((state) => selectGroupAccountsStatus(state, groupId));
    const groupMemberStatus = useAppSelector((state) => selectGroupMemberStatus(state, groupId));

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
        dispatch(fetchGroupDependencies({ groupId, api, fetchAnyway: true }))
            .unwrap()
            .catch((err: SerializedError) => {
                console.warn(err);
                toast.error(`Error while loading transactions and accounts: ${err.message}`);
            });

        return () => {
            dispatch(unsubscribe({ subscription: { type: "transaction", groupId }, websocket: ws }));
            dispatch(unsubscribe({ subscription: { type: "account", groupId }, websocket: ws }));
            dispatch(unsubscribe({ subscription: { type: "group_member", groupId }, websocket: ws }));
        };
    }, [dispatch, groupId, groupExists]);

    if (!groupExists) {
        console.error("did not find group, redirecting to 404");
        return <Navigate to="/404" />;
    }

    if (
        group === undefined ||
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
        <Suspense fallback={<Loading />}>
            <Routes>
                <Route path="log" element={<GroupActivity groupId={groupId} />} />
                <Route path="accounts" element={<PersonalAccountList groupId={groupId} />} />
                <Route path="events" element={<ClearingAccountList groupId={groupId} />} />
                <Route path="detail" element={<GroupSettingsPage groupId={groupId} />} />
                <Route path="balances" element={<Balances groupId={groupId} />} />
                <Route path="settlement-plan" element={<SettlementPlanDisplay groupId={group.id} />} />
                <Route path="/" element={<TransactionList groupId={groupId} />} />
                <Route path="transactions/:id" element={<TransactionDetail groupId={groupId} />} />
                <Route path="accounts/:id" element={<AccountDetail groupId={group.id} />} />
                <Route path="events/:id" element={<AccountDetail groupId={group.id} />} />
            </Routes>
        </Suspense>
    );
};

export default Group;
