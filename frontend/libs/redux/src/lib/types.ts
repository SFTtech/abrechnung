import { Group, GroupInvite, GroupLog, GroupMember, User } from "@abrechnung/api";
import { Account, Transaction, TransactionBalanceEffect } from "@abrechnung/types";

export const ENABLE_OFFLINE_MODE = false;

export type StateStatus = "loading" | "failed" | "initialized";

export type Subscription =
    | {
          type: "account";
          groupId: number;
      }
    | {
          type: "transaction";
          groupId: number;
      }
    | {
          type: "group";
          userId: number;
      };

export type SubscriptionSliceState = AbrechnungInstanceAwareState & {
    subscriptions: Subscription[];
};

export type GroupScopedState<T> = {
    byGroupId: { [k: number]: T };
};
export type AbrechnungInstanceAwareState = {
    activeInstanceId: number;
};

export interface AuthState {
    baseUrl: string | undefined;
    accessToken: string | undefined;
    profile: User | undefined;
}

export type AuthSliceState = AbrechnungInstanceAwareState & AuthState;

export type GroupState = {
    groups: {
        byId: { [k: number]: Group };
        ids: number[];
    };
    status: StateStatus;
};

export type GroupSliceState = AbrechnungInstanceAwareState & GroupState;

export interface AccountState {
    accounts: {
        byId: { [k: number]: Account };
        ids: number[];
    };
    wipAccounts: {
        byId: { [k: number]: Account };
        ids: number[];
    };
    status: StateStatus;
}

export type AccountSliceState = AbrechnungInstanceAwareState &
    GroupScopedState<AccountState> & {
        nextLocalAccountId: number;
    };

export interface TransactionState {
    transactions: {
        byId: { [transactionId: number]: Transaction };
        balanceEffects: { [transactionId: number]: TransactionBalanceEffect };
        ids: number[];
    };
    wipTransactions: {
        byId: { [transactionId: number]: Transaction };
        balanceEffects: { [transactionId: number]: TransactionBalanceEffect };
        ids: number[];
    };
    status: StateStatus;
}

export type TransactionSliceState = AbrechnungInstanceAwareState &
    GroupScopedState<TransactionState> & {
        nextLocalTransactionId: number;
        nextLocalPositionId: number;
        nextLocalFileId: number;
    };

export interface ITransactionRootState {
    transactions: TransactionSliceState;
}

export interface IAccountRootState {
    accounts: AccountSliceState;
}

export interface IAuthRootState {
    auth: AuthSliceState;
}

export interface IGroupRootState {
    groups: GroupSliceState;
}

export type IRootState = ITransactionRootState & IAccountRootState & IAuthRootState & IGroupRootState;
