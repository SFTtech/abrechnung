import { Group, GroupInvite, GroupLog, GroupMember, User } from "@abrechnung/api";
import { Account, Transaction, TransactionAttachment, TransactionPosition } from "@abrechnung/types";

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
          type: "group_log";
          groupId: number;
      }
    | {
          type: "group_invite";
          groupId: number;
      }
    | {
          type: "group_member";
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

export interface GroupInfo {
    groupMembers: {
        byId: { [k: number]: GroupMember };
        ids: number[];
    };
    groupMembersStatus: StateStatus;
    groupInvites: {
        byId: { [k: number]: GroupInvite };
        ids: number[];
    };
    groupInvitesStatus: StateStatus;
    groupLog: {
        byId: { [k: number]: GroupLog };
        ids: number[];
    };
    groupLogStatus: StateStatus;
}

export type GroupState = GroupScopedState<GroupInfo> & {
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
    pendingAccounts: {
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
        byId: { [k: number]: Transaction };
        ids: number[];
    };
    wipTransactions: {
        byId: { [k: number]: Transaction };
        ids: number[];
    };
    pendingTransactions: {
        byId: { [k: number]: Transaction };
        ids: number[];
    };
    positions: {
        byId: { [k: number]: TransactionPosition };
        ids: number[];
    };
    wipPositions: {
        byId: { [k: number]: TransactionPosition };
        ids: number[];
    };
    pendingPositions: {
        byId: { [k: number]: TransactionPosition };
        ids: number[];
    };
    attachments: {
        byId: { [k: number]: TransactionAttachment };
        ids: number[];
    };
    status: StateStatus;
}

export type TransactionSliceState = AbrechnungInstanceAwareState &
    GroupScopedState<TransactionState> & { nextLocalTransactionId: number; nextLocalPositionId: number };

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

export interface ISubscriptionRootState {
    subscriptions: SubscriptionSliceState;
}

export type IRootState = ITransactionRootState &
    IAccountRootState &
    IAuthRootState &
    IGroupRootState &
    ISubscriptionRootState;
