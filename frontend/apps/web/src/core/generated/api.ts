import { emptySplitApi as api } from "./emptyApi";
export const addTagTypes = [
    "transactions",
    "groups",
    "group_members",
    "group_logs",
    "group_invites",
    "auth",
    "accounts",
    "common",
] as const;
const injectedRtkApi = api
    .enhanceEndpoints({
        addTagTypes,
    })
    .injectEndpoints({
        endpoints: (build) => ({
            listTransactions: build.query<ListTransactionsApiResponse, ListTransactionsApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions`,
                    params: {
                        min_last_changed: queryArg.minLastChanged,
                        transaction_ids: queryArg.transactionIds,
                    },
                }),
                providesTags: ["transactions"],
            }),
            createTransaction: build.mutation<CreateTransactionApiResponse, CreateTransactionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions`,
                    method: "POST",
                    body: queryArg.newTransaction,
                }),
                invalidatesTags: ["transactions"],
            }),
            getTransaction: build.query<GetTransactionApiResponse, GetTransactionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions/${queryArg.transactionId}`,
                }),
                providesTags: ["transactions"],
            }),
            updateTransaction: build.mutation<UpdateTransactionApiResponse, UpdateTransactionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions/${queryArg.transactionId}`,
                    method: "POST",
                    body: queryArg.updateTransaction,
                }),
                invalidatesTags: ["transactions"],
            }),
            deleteTransaction: build.mutation<DeleteTransactionApiResponse, DeleteTransactionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions/${queryArg.transactionId}`,
                    method: "DELETE",
                }),
                invalidatesTags: ["transactions"],
            }),
            updateTransactionPositions: build.mutation<
                UpdateTransactionPositionsApiResponse,
                UpdateTransactionPositionsApiArg
            >({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/transactions/${queryArg.transactionId}/positions`,
                    method: "POST",
                    body: queryArg.updatePositionsPayload,
                }),
                invalidatesTags: ["transactions"],
            }),
            getFileContents: build.query<GetFileContentsApiResponse, GetFileContentsApiArg>({
                query: (queryArg) => ({ url: `/api/v1/files/${queryArg.fileId}/${queryArg.blobId}` }),
                providesTags: ["transactions"],
            }),
            previewGroup: build.mutation<PreviewGroupApiResponse, PreviewGroupApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/preview`,
                    method: "POST",
                    body: queryArg.previewGroupPayload,
                }),
                invalidatesTags: ["groups"],
            }),
            joinGroup: build.mutation<JoinGroupApiResponse, JoinGroupApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/join`,
                    method: "POST",
                    body: queryArg.previewGroupPayload,
                }),
                invalidatesTags: ["groups"],
            }),
            listGroups: build.query<ListGroupsApiResponse, ListGroupsApiArg>({
                query: () => ({ url: `/api/v1/groups` }),
                providesTags: ["groups"],
            }),
            createGroup: build.mutation<CreateGroupApiResponse, CreateGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups`, method: "POST", body: queryArg.groupPayload }),
                invalidatesTags: ["groups"],
            }),
            getGroup: build.query<GetGroupApiResponse, GetGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}` }),
                providesTags: ["groups"],
            }),
            updateGroup: build.mutation<UpdateGroupApiResponse, UpdateGroupApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}`,
                    method: "POST",
                    body: queryArg.groupPayload,
                }),
                invalidatesTags: ["groups"],
            }),
            deleteGroup: build.mutation<DeleteGroupApiResponse, DeleteGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}`, method: "DELETE" }),
                invalidatesTags: ["groups"],
            }),
            leaveGroup: build.mutation<LeaveGroupApiResponse, LeaveGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/leave`, method: "POST" }),
                invalidatesTags: ["groups"],
            }),
            listMembers: build.query<ListMembersApiResponse, ListMembersApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/members` }),
                providesTags: ["groups", "group_members"],
            }),
            updateMemberPermissions: build.mutation<UpdateMemberPermissionsApiResponse, UpdateMemberPermissionsApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/members`,
                    method: "POST",
                    body: queryArg.updateGroupMemberPayload,
                }),
                invalidatesTags: ["groups", "group_members"],
            }),
            listLog: build.query<ListLogApiResponse, ListLogApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/logs` }),
                providesTags: ["groups", "group_logs"],
            }),
            sendGroupMessage: build.mutation<SendGroupMessageApiResponse, SendGroupMessageApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/send_message`,
                    method: "POST",
                    body: queryArg.groupMessage,
                }),
                invalidatesTags: ["groups", "group_logs"],
            }),
            listInvites: build.query<ListInvitesApiResponse, ListInvitesApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/invites` }),
                providesTags: ["groups", "group_invites"],
            }),
            createInvite: build.mutation<CreateInviteApiResponse, CreateInviteApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/invites`,
                    method: "POST",
                    body: queryArg.createInvitePayload,
                }),
                invalidatesTags: ["groups", "group_invites"],
            }),
            deleteInvite: build.mutation<DeleteInviteApiResponse, DeleteInviteApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/invites/${queryArg.inviteId}`,
                    method: "DELETE",
                }),
                invalidatesTags: ["groups", "group_invites"],
            }),
            archiveGroup: build.mutation<ArchiveGroupApiResponse, ArchiveGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/archive`, method: "POST" }),
                invalidatesTags: ["groups"],
            }),
            unarchiveGroup: build.mutation<UnarchiveGroupApiResponse, UnarchiveGroupApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/un-archive`, method: "POST" }),
                invalidatesTags: ["groups"],
            }),
            getToken: build.mutation<GetTokenApiResponse, GetTokenApiArg>({
                query: (queryArg) => ({ url: `/api/v1/auth/token`, method: "POST", body: queryArg.bodyGetToken }),
                invalidatesTags: ["auth"],
            }),
            login: build.mutation<LoginApiResponse, LoginApiArg>({
                query: (queryArg) => ({ url: `/api/v1/auth/login`, method: "POST", body: queryArg.loginPayload }),
                invalidatesTags: ["auth"],
            }),
            logout: build.mutation<LogoutApiResponse, LogoutApiArg>({
                query: () => ({ url: `/api/v1/auth/logout`, method: "POST" }),
                invalidatesTags: ["auth"],
            }),
            register: build.mutation<RegisterApiResponse, RegisterApiArg>({
                query: (queryArg) => ({ url: `/api/v1/auth/register`, method: "POST", body: queryArg.registerPayload }),
                invalidatesTags: ["auth"],
            }),
            confirmRegistration: build.mutation<ConfirmRegistrationApiResponse, ConfirmRegistrationApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/confirm_registration`,
                    method: "POST",
                    body: queryArg.confirmRegistrationPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            getProfile: build.query<GetProfileApiResponse, GetProfileApiArg>({
                query: () => ({ url: `/api/v1/profile` }),
                providesTags: ["auth"],
            }),
            changePassword: build.mutation<ChangePasswordApiResponse, ChangePasswordApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/profile/change_password`,
                    method: "POST",
                    body: queryArg.changePasswordPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            changeEmail: build.mutation<ChangeEmailApiResponse, ChangeEmailApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/profile/change_email`,
                    method: "POST",
                    body: queryArg.changeEmailPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            confirmEmailChange: build.mutation<ConfirmEmailChangeApiResponse, ConfirmEmailChangeApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/confirm_email_change`,
                    method: "POST",
                    body: queryArg.confirmEmailChangePayload,
                }),
                invalidatesTags: ["auth"],
            }),
            recoverPassword: build.mutation<RecoverPasswordApiResponse, RecoverPasswordApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/recover_password`,
                    method: "POST",
                    body: queryArg.recoverPasswordPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            confirmPasswordRecovery: build.mutation<ConfirmPasswordRecoveryApiResponse, ConfirmPasswordRecoveryApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/confirm_password_recovery`,
                    method: "POST",
                    body: queryArg.confirmPasswordRecoveryPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            deleteSession: build.mutation<DeleteSessionApiResponse, DeleteSessionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/delete_session`,
                    method: "POST",
                    body: queryArg.deleteSessionPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            renameSession: build.mutation<RenameSessionApiResponse, RenameSessionApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/auth/rename_session`,
                    method: "POST",
                    body: queryArg.renameSessionPayload,
                }),
                invalidatesTags: ["auth"],
            }),
            listAccounts: build.query<ListAccountsApiResponse, ListAccountsApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/accounts` }),
                providesTags: ["accounts"],
            }),
            createAccount: build.mutation<CreateAccountApiResponse, CreateAccountApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/accounts`,
                    method: "POST",
                    body: queryArg.newAccount,
                }),
                invalidatesTags: ["accounts"],
            }),
            getAccount: build.query<GetAccountApiResponse, GetAccountApiArg>({
                query: (queryArg) => ({ url: `/api/v1/groups/${queryArg.groupId}/accounts/${queryArg.accountId}` }),
                providesTags: ["accounts"],
            }),
            updateAccount: build.mutation<UpdateAccountApiResponse, UpdateAccountApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/accounts/${queryArg.accountId}`,
                    method: "POST",
                    body: queryArg.newAccount,
                }),
                invalidatesTags: ["accounts"],
            }),
            deleteAccount: build.mutation<DeleteAccountApiResponse, DeleteAccountApiArg>({
                query: (queryArg) => ({
                    url: `/api/v1/groups/${queryArg.groupId}/accounts/${queryArg.accountId}`,
                    method: "DELETE",
                }),
                invalidatesTags: ["accounts"],
            }),
            getVersion: build.query<GetVersionApiResponse, GetVersionApiArg>({
                query: () => ({ url: `/api/version` }),
                providesTags: ["common"],
            }),
            getFrontendConfig: build.query<GetFrontendConfigApiResponse, GetFrontendConfigApiArg>({
                query: () => ({ url: `/api/config` }),
                providesTags: ["common"],
            }),
        }),
        overrideExisting: false,
    });
export { injectedRtkApi as api };
export type ListTransactionsApiResponse = /** status 200 Successful Response */ Transaction[];
export type ListTransactionsApiArg = {
    groupId: number;
    minLastChanged?: string | null;
    transactionIds?: string | null;
};
export type CreateTransactionApiResponse = /** status 200 Successful Response */ Transaction;
export type CreateTransactionApiArg = {
    groupId: number;
    newTransaction: NewTransaction;
};
export type GetTransactionApiResponse = /** status 200 Successful Response */ Transaction;
export type GetTransactionApiArg = {
    groupId: number;
    transactionId: number;
};
export type UpdateTransactionApiResponse = /** status 200 Successful Response */ Transaction;
export type UpdateTransactionApiArg = {
    groupId: number;
    transactionId: number;
    updateTransaction: UpdateTransaction;
};
export type DeleteTransactionApiResponse = /** status 200 Successful Response */ Transaction;
export type DeleteTransactionApiArg = {
    groupId: number;
    transactionId: number;
};
export type UpdateTransactionPositionsApiResponse = /** status 200 Successful Response */ Transaction;
export type UpdateTransactionPositionsApiArg = {
    groupId: number;
    transactionId: number;
    updatePositionsPayload: UpdatePositionsPayload;
};
export type GetFileContentsApiResponse = unknown;
export type GetFileContentsApiArg = {
    fileId: number;
    blobId: number;
};
export type PreviewGroupApiResponse = /** status 200 Successful Response */ GroupPreview;
export type PreviewGroupApiArg = {
    previewGroupPayload: PreviewGroupPayload;
};
export type JoinGroupApiResponse = /** status 200 Successful Response */ Group;
export type JoinGroupApiArg = {
    previewGroupPayload: PreviewGroupPayload;
};
export type ListGroupsApiResponse = /** status 200 Successful Response */ Group[];
export type ListGroupsApiArg = void;
export type CreateGroupApiResponse = /** status 200 Successful Response */ Group;
export type CreateGroupApiArg = {
    groupPayload: GroupPayload;
};
export type GetGroupApiResponse = /** status 200 Successful Response */ Group;
export type GetGroupApiArg = {
    groupId: number;
};
export type UpdateGroupApiResponse = /** status 200 Successful Response */ Group;
export type UpdateGroupApiArg = {
    groupId: number;
    groupPayload: GroupPayload;
};
export type DeleteGroupApiResponse = unknown;
export type DeleteGroupApiArg = {
    groupId: number;
};
export type LeaveGroupApiResponse = unknown;
export type LeaveGroupApiArg = {
    groupId: number;
};
export type ListMembersApiResponse = /** status 200 Successful Response */ GroupMember[];
export type ListMembersApiArg = {
    groupId: number;
};
export type UpdateMemberPermissionsApiResponse = /** status 200 Successful Response */ GroupMember;
export type UpdateMemberPermissionsApiArg = {
    groupId: number;
    updateGroupMemberPayload: UpdateGroupMemberPayload;
};
export type ListLogApiResponse = /** status 200 Successful Response */ GroupLog[];
export type ListLogApiArg = {
    groupId: number;
};
export type SendGroupMessageApiResponse = unknown;
export type SendGroupMessageApiArg = {
    groupId: number;
    groupMessage: GroupMessage;
};
export type ListInvitesApiResponse = /** status 200 Successful Response */ GroupInvite[];
export type ListInvitesApiArg = {
    groupId: number;
};
export type CreateInviteApiResponse = /** status 200 Successful Response */ GroupInvite;
export type CreateInviteApiArg = {
    groupId: number;
    createInvitePayload: CreateInvitePayload;
};
export type DeleteInviteApiResponse = unknown;
export type DeleteInviteApiArg = {
    groupId: number;
    inviteId: number;
};
export type ArchiveGroupApiResponse = /** status 200 Successful Response */ any;
export type ArchiveGroupApiArg = {
    groupId: number;
};
export type UnarchiveGroupApiResponse = /** status 200 Successful Response */ any;
export type UnarchiveGroupApiArg = {
    groupId: number;
};
export type GetTokenApiResponse = /** status 200 Successful Response */ Token;
export type GetTokenApiArg = {
    bodyGetToken: BodyGetToken;
};
export type LoginApiResponse = /** status 200 Successful Response */ Token;
export type LoginApiArg = {
    loginPayload: LoginPayload;
};
export type LogoutApiResponse = unknown;
export type LogoutApiArg = void;
export type RegisterApiResponse = /** status 200 Successful Response */ RegisterResponse;
export type RegisterApiArg = {
    registerPayload: RegisterPayload;
};
export type ConfirmRegistrationApiResponse = unknown;
export type ConfirmRegistrationApiArg = {
    confirmRegistrationPayload: ConfirmRegistrationPayload;
};
export type GetProfileApiResponse = /** status 200 Successful Response */ User;
export type GetProfileApiArg = void;
export type ChangePasswordApiResponse = unknown;
export type ChangePasswordApiArg = {
    changePasswordPayload: ChangePasswordPayload;
};
export type ChangeEmailApiResponse = unknown;
export type ChangeEmailApiArg = {
    changeEmailPayload: ChangeEmailPayload;
};
export type ConfirmEmailChangeApiResponse = unknown;
export type ConfirmEmailChangeApiArg = {
    confirmEmailChangePayload: ConfirmEmailChangePayload;
};
export type RecoverPasswordApiResponse = unknown;
export type RecoverPasswordApiArg = {
    recoverPasswordPayload: RecoverPasswordPayload;
};
export type ConfirmPasswordRecoveryApiResponse = unknown;
export type ConfirmPasswordRecoveryApiArg = {
    confirmPasswordRecoveryPayload: ConfirmPasswordRecoveryPayload;
};
export type DeleteSessionApiResponse = unknown;
export type DeleteSessionApiArg = {
    deleteSessionPayload: DeleteSessionPayload;
};
export type RenameSessionApiResponse = unknown;
export type RenameSessionApiArg = {
    renameSessionPayload: RenameSessionPayload;
};
export type ListAccountsApiResponse = /** status 200 Successful Response */ (ClearingAccount | PersonalAccount)[];
export type ListAccountsApiArg = {
    groupId: number;
};
export type CreateAccountApiResponse = /** status 200 Successful Response */ ClearingAccount | PersonalAccount;
export type CreateAccountApiArg = {
    groupId: number;
    newAccount: NewAccount;
};
export type GetAccountApiResponse = /** status 200 Successful Response */ ClearingAccount | PersonalAccount;
export type GetAccountApiArg = {
    groupId: number;
    accountId: number;
};
export type UpdateAccountApiResponse = /** status 200 Successful Response */ ClearingAccount | PersonalAccount;
export type UpdateAccountApiArg = {
    groupId: number;
    accountId: number;
    newAccount: NewAccount;
};
export type DeleteAccountApiResponse = /** status 200 Successful Response */ ClearingAccount | PersonalAccount;
export type DeleteAccountApiArg = {
    groupId: number;
    accountId: number;
};
export type GetVersionApiResponse = /** status 200 Successful Response */ VersionResponse;
export type GetVersionApiArg = void;
export type GetFrontendConfigApiResponse = /** status 200 Successful Response */ FrontendConfig;
export type GetFrontendConfigApiArg = void;
export type TransactionType = "mimo" | "purchase" | "transfer";
export type TransactionPosition = {
    name: string;
    price: number;
    communist_shares: number;
    usages: {
        [key: string]: number;
    };
    id: number;
    deleted: boolean;
};
export type FileAttachment = {
    id: number;
    filename: string;
    blob_id: number | null;
    mime_type: string | null;
    host_url?: string | null;
    deleted: boolean;
};
export type Transaction = {
    id: number;
    group_id: number;
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags: string[];
    deleted: boolean;
    creditor_shares: {
        [key: string]: number;
    };
    debitor_shares: {
        [key: string]: number;
    };
    last_changed: string;
    positions: TransactionPosition[];
    files: FileAttachment[];
};
export type ValidationError = {
    loc: (string | number)[];
    msg: string;
    type: string;
};
export type HttpValidationError = {
    detail?: ValidationError[];
};
export type NewFile = {
    filename: string;
    mime_type: string;
    content: string;
};
export type NewTransactionPosition = {
    name: string;
    price: number;
    communist_shares: number;
    usages: {
        [key: string]: number;
    };
};
export type NewTransaction = {
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags?: string[];
    creditor_shares: {
        [key: string]: number;
    };
    debitor_shares: {
        [key: string]: number;
    };
    new_files?: NewFile[];
    new_positions?: NewTransactionPosition[];
};
export type UpdateFile = {
    id: number;
    filename: string;
    deleted: boolean;
};
export type UpdateTransaction = {
    type: TransactionType;
    name: string;
    description: string;
    value: number;
    currency_symbol: string;
    currency_conversion_rate: number;
    billed_at: string;
    tags?: string[];
    creditor_shares: {
        [key: string]: number;
    };
    debitor_shares: {
        [key: string]: number;
    };
    new_files?: NewFile[];
    new_positions?: NewTransactionPosition[];
    changed_files?: UpdateFile[];
    changed_positions?: TransactionPosition[];
};
export type UpdatePositionsPayload = {
    positions: TransactionPosition[];
};
export type GroupPreview = {
    id: number;
    name: string;
    description: string;
    currency_symbol: string;
    terms: string;
    created_at: string;
    invite_single_use: boolean;
    invite_valid_until: string;
    invite_description: string;
};
export type PreviewGroupPayload = {
    invite_token: string;
};
export type Group = {
    id: number;
    name: string;
    description: string;
    currency_symbol: string;
    terms: string;
    add_user_account_on_join: boolean;
    created_at: string;
    created_by: number;
    last_changed: string;
    archived: boolean;
    is_owner: boolean;
    can_write: boolean;
};
export type GroupPayload = {
    name: string;
    description?: string;
    currency_symbol: string;
    add_user_account_on_join?: boolean;
    terms?: string;
};
export type GroupMember = {
    user_id: number;
    username: string;
    is_owner: boolean;
    can_write: boolean;
    description: string;
    joined_at: string;
    invited_by: number | null;
};
export type UpdateGroupMemberPayload = {
    user_id: number;
    can_write: boolean;
    is_owner: boolean;
};
export type GroupLog = {
    id: number;
    user_id: number;
    logged_at: string;
    type: string;
    message: string;
    affected: number | null;
};
export type GroupMessage = {
    message: string;
};
export type GroupInvite = {
    id: number;
    created_by: number;
    token: string | null;
    single_use: boolean;
    join_as_editor: boolean;
    description: string;
    valid_until: string;
};
export type CreateInvitePayload = {
    description: string;
    single_use: boolean;
    join_as_editor: boolean;
    valid_until: string;
};
export type Token = {
    user_id: number;
    access_token: string;
};
export type BodyGetToken = {
    grant_type?: string | null;
    username: string;
    password: string;
    scope?: string;
    client_id?: string | null;
    client_secret?: string | null;
};
export type LoginPayload = {
    username: string;
    password: string;
    session_name: string;
};
export type RegisterResponse = {
    user_id: number;
};
export type RegisterPayload = {
    username: string;
    password: string;
    email: string;
    invite_token?: string | null;
};
export type ConfirmRegistrationPayload = {
    token: string;
};
export type Session = {
    id: number;
    name: string;
    valid_until: string | null;
    last_seen: string;
};
export type User = {
    id: number;
    username: string;
    email: string;
    registered_at: string;
    deleted: boolean;
    pending: boolean;
    sessions: Session[];
    is_guest_user: boolean;
};
export type ChangePasswordPayload = {
    new_password: string;
    old_password: string;
};
export type ChangeEmailPayload = {
    email: string;
    password: string;
};
export type ConfirmEmailChangePayload = {
    token: string;
};
export type RecoverPasswordPayload = {
    email: string;
};
export type ConfirmPasswordRecoveryPayload = {
    token: string;
    new_password: string;
};
export type DeleteSessionPayload = {
    session_id: number;
};
export type RenameSessionPayload = {
    session_id: number;
    name: string;
};
export type ClearingAccount = {
    id: number;
    group_id: number;
    type: "clearing";
    name: string;
    description: string;
    date_info: string;
    tags: string[];
    clearing_shares: {
        [key: string]: number;
    };
    last_changed: string;
    deleted: boolean;
};
export type PersonalAccount = {
    id: number;
    group_id: number;
    type: "personal";
    name: string;
    description: string;
    owning_user_id: number | null;
    deleted: boolean;
    last_changed: string;
};
export type AccountType = "personal" | "clearing";
export type NewAccount = {
    type: AccountType;
    name: string;
    description?: string;
    owning_user_id?: number | null;
    date_info?: string | null;
    deleted?: boolean;
    tags?: string[];
    clearing_shares?: {
        [key: string]: number;
    };
};
export type VersionResponse = {
    version: string;
    major_version: number;
    minor_version: number;
    patch_version: number;
};
export type ServiceMessageType = "info" | "error" | "warning" | "success";
export type ServiceMessage = {
    type: ServiceMessageType;
    title?: string | null;
    body: string;
};
export type FrontendConfig = {
    messages?: ServiceMessage[] | null;
    imprint_url?: string | null;
    source_code_url: string;
    issue_tracker_url: string;
};
export const {
    useListTransactionsQuery,
    useLazyListTransactionsQuery,
    useCreateTransactionMutation,
    useGetTransactionQuery,
    useLazyGetTransactionQuery,
    useUpdateTransactionMutation,
    useDeleteTransactionMutation,
    useUpdateTransactionPositionsMutation,
    useGetFileContentsQuery,
    useLazyGetFileContentsQuery,
    usePreviewGroupMutation,
    useJoinGroupMutation,
    useListGroupsQuery,
    useLazyListGroupsQuery,
    useCreateGroupMutation,
    useGetGroupQuery,
    useLazyGetGroupQuery,
    useUpdateGroupMutation,
    useDeleteGroupMutation,
    useLeaveGroupMutation,
    useListMembersQuery,
    useLazyListMembersQuery,
    useUpdateMemberPermissionsMutation,
    useListLogQuery,
    useLazyListLogQuery,
    useSendGroupMessageMutation,
    useListInvitesQuery,
    useLazyListInvitesQuery,
    useCreateInviteMutation,
    useDeleteInviteMutation,
    useArchiveGroupMutation,
    useUnarchiveGroupMutation,
    useGetTokenMutation,
    useLoginMutation,
    useLogoutMutation,
    useRegisterMutation,
    useConfirmRegistrationMutation,
    useGetProfileQuery,
    useLazyGetProfileQuery,
    useChangePasswordMutation,
    useChangeEmailMutation,
    useConfirmEmailChangeMutation,
    useRecoverPasswordMutation,
    useConfirmPasswordRecoveryMutation,
    useDeleteSessionMutation,
    useRenameSessionMutation,
    useListAccountsQuery,
    useLazyListAccountsQuery,
    useCreateAccountMutation,
    useGetAccountQuery,
    useLazyGetAccountQuery,
    useUpdateAccountMutation,
    useDeleteAccountMutation,
    useGetVersionQuery,
    useLazyGetVersionQuery,
    useGetFrontendConfigQuery,
    useLazyGetFrontendConfigQuery,
} = injectedRtkApi;
