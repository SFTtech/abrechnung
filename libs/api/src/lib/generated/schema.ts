/* istanbul ignore file */
/* tslint:disable */
/* oxlint-disable */
import { z } from "zod";

export type AccountType = z.infer<typeof AccountType>;
export const AccountType = z.union([z.literal("personal"), z.literal("clearing")]);

export type Body_get_token = z.infer<typeof Body_get_token>;
export const Body_get_token = z.object({
    grant_type: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    username: z.string(),
    password: z.string(),
    scope: z.union([z.string(), z.undefined()]).optional(),
    client_id: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    client_secret: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
});

export type ChangeEmailPayload = z.infer<typeof ChangeEmailPayload>;
export const ChangeEmailPayload = z.object({
    email: z.string(),
    password: z.string(),
});

export type ChangePasswordPayload = z.infer<typeof ChangePasswordPayload>;
export const ChangePasswordPayload = z.object({
    new_password: z.string(),
    old_password: z.string(),
});

export type ClearingAccount = z.infer<typeof ClearingAccount>;
export const ClearingAccount = z.object({
    id: z.number(),
    group_id: z.number(),
    type: z.string(),
    name: z.string(),
    description: z.string(),
    date_info: z.string(),
    tags: z.array(z.string()),
    clearing_shares: z.record(z.string(), z.number()),
    last_changed: z.string(),
    deleted: z.boolean(),
});

export type ClearingAccountJsonExportV1 = z.infer<typeof ClearingAccountJsonExportV1>;
export const ClearingAccountJsonExportV1 = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    date_info: z.string(),
    tags: z.array(z.string()),
    clearing_shares: z.record(z.string(), z.number()),
});

export type ConfirmEmailChangePayload = z.infer<typeof ConfirmEmailChangePayload>;
export const ConfirmEmailChangePayload = z.object({
    token: z.string(),
});

export type ConfirmPasswordRecoveryPayload = z.infer<typeof ConfirmPasswordRecoveryPayload>;
export const ConfirmPasswordRecoveryPayload = z.object({
    token: z.string(),
    new_password: z.string(),
});

export type ConfirmRegistrationPayload = z.infer<typeof ConfirmRegistrationPayload>;
export const ConfirmRegistrationPayload = z.object({
    token: z.string(),
});

export type CreateInvitePayload = z.infer<typeof CreateInvitePayload>;
export const CreateInvitePayload = z.object({
    description: z.string(),
    single_use: z.boolean(),
    join_as_editor: z.boolean(),
    valid_until: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
});

export type CurrencyConversionRate = z.infer<typeof CurrencyConversionRate>;
export const CurrencyConversionRate = z.object({
    base_currency: z.string(),
    rates: z.record(z.string(), z.number()),
});

export type DeleteSessionPayload = z.infer<typeof DeleteSessionPayload>;
export const DeleteSessionPayload = z.object({
    session_id: z.number(),
});

export type FileAttachment = z.infer<typeof FileAttachment>;
export const FileAttachment = z.object({
    id: z.number(),
    filename: z.string(),
    blob_id: z.union([z.number(), z.null()]),
    mime_type: z.union([z.string(), z.null()]),
    host_url: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    deleted: z.boolean(),
});

export type FileAttachmentJsonExportV1 = z.infer<typeof FileAttachmentJsonExportV1>;
export const FileAttachmentJsonExportV1 = z.object({
    filename: z.string(),
    mime_type: z.string(),
    content: z.string(),
});

export type ServiceMessageType = z.infer<typeof ServiceMessageType>;
export const ServiceMessageType = z.union([
    z.literal("info"),
    z.literal("error"),
    z.literal("warning"),
    z.literal("success"),
]);

export type ServiceMessage = z.infer<typeof ServiceMessage>;
export const ServiceMessage = z.object({
    type: ServiceMessageType,
    title: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    body: z.string(),
});

export type FrontendConfig = z.infer<typeof FrontendConfig>;
export const FrontendConfig = z.object({
    messages: z.union([z.union([z.array(ServiceMessage), z.null()]), z.undefined()]).optional(),
    imprint_url: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    source_code_url: z.string(),
    issue_tracker_url: z.string(),
});

export type Group = z.infer<typeof Group>;
export const Group = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    currency_identifier: z.string(),
    terms: z.string(),
    add_user_account_on_join: z.boolean(),
    created_at: z.string(),
    created_by: z.number(),
    last_changed: z.string(),
    archived: z.boolean(),
    is_owner: z.boolean(),
    can_write: z.boolean(),
    owned_account_id: z.union([z.number(), z.null()]),
});

export type GroupCreatePayload = z.infer<typeof GroupCreatePayload>;
export const GroupCreatePayload = z.object({
    name: z.string(),
    description: z.union([z.string(), z.undefined()]).optional(),
    add_user_account_on_join: z.union([z.boolean(), z.undefined()]).optional(),
    terms: z.union([z.string(), z.undefined()]).optional(),
    currency_identifier: z.string(),
});

export type GroupInvite = z.infer<typeof GroupInvite>;
export const GroupInvite = z.object({
    id: z.number(),
    created_by: z.number(),
    token: z.union([z.string(), z.null()]),
    single_use: z.boolean(),
    join_as_editor: z.boolean(),
    description: z.string(),
    valid_until: z.union([z.string(), z.null()]),
});

export type GroupMetadataExportV1 = z.infer<typeof GroupMetadataExportV1>;
export const GroupMetadataExportV1 = z.object({
    name: z.string(),
    description: z.string(),
    currency_identifier: z.string(),
    terms: z.string(),
    add_user_account_on_join: z.boolean(),
});

export type PersonalAccountJsonExportV1 = z.infer<typeof PersonalAccountJsonExportV1>;
export const PersonalAccountJsonExportV1 = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
});

export type TransactionType = z.infer<typeof TransactionType>;
export const TransactionType = z.union([z.literal("mimo"), z.literal("purchase"), z.literal("transfer")]);

export type TransactionPositionJsonExportV1 = z.infer<typeof TransactionPositionJsonExportV1>;
export const TransactionPositionJsonExportV1 = z.object({
    id: z.number(),
    name: z.string(),
    price: z.number(),
    communist_shares: z.number(),
    usages: z.record(z.string(), z.number()),
});

export type TransactionJsonExportV1 = z.infer<typeof TransactionJsonExportV1>;
export const TransactionJsonExportV1 = z.object({
    id: z.number(),
    type: TransactionType,
    name: z.string(),
    description: z.string(),
    value: z.number(),
    currency_identifier: z.string(),
    currency_conversion_rate: z.number(),
    billed_at: z.string(),
    tags: z.array(z.string()),
    creditor_shares: z.record(z.string(), z.number()),
    debitor_shares: z.record(z.string(), z.number()),
    positions: z.array(TransactionPositionJsonExportV1),
    files: z.array(FileAttachmentJsonExportV1),
});

export type GroupJsonExportV1 = z.infer<typeof GroupJsonExportV1>;
export const GroupJsonExportV1 = z.object({
    version: z.union([z.number(), z.undefined()]).optional(),
    metadata: GroupMetadataExportV1,
    personal_accounts: z.array(PersonalAccountJsonExportV1),
    events: z.array(ClearingAccountJsonExportV1),
    transactions: z.array(TransactionJsonExportV1),
});

export type GroupLog = z.infer<typeof GroupLog>;
export const GroupLog = z.object({
    id: z.number(),
    user_id: z.number(),
    logged_at: z.string(),
    type: z.string(),
    message: z.string(),
    affected: z.union([z.number(), z.null()]),
});

export type GroupMember = z.infer<typeof GroupMember>;
export const GroupMember = z.object({
    user_id: z.number(),
    username: z.string(),
    is_owner: z.boolean(),
    can_write: z.boolean(),
    description: z.string(),
    joined_at: z.string(),
    invited_by: z.union([z.number(), z.null()]),
    owned_account_id: z.union([z.number(), z.null()]),
});

export type GroupMessage = z.infer<typeof GroupMessage>;
export const GroupMessage = z.object({
    message: z.string(),
});

export type GroupPreview = z.infer<typeof GroupPreview>;
export const GroupPreview = z.object({
    id: z.number(),
    is_already_member: z.boolean(),
    name: z.string(),
    description: z.string(),
    currency_identifier: z.string(),
    terms: z.string(),
    created_at: z.string(),
    invite_single_use: z.boolean(),
    invite_valid_until: z.union([z.string(), z.null()]),
    invite_description: z.string(),
});

export type GroupUpdatePayload = z.infer<typeof GroupUpdatePayload>;
export const GroupUpdatePayload = z.object({
    name: z.string(),
    description: z.union([z.string(), z.undefined()]).optional(),
    add_user_account_on_join: z.union([z.boolean(), z.undefined()]).optional(),
    terms: z.union([z.string(), z.undefined()]).optional(),
});

export type ValidationError = z.infer<typeof ValidationError>;
export const ValidationError = z.object({
    loc: z.array(z.union([z.string(), z.number()])),
    msg: z.string(),
    type: z.string(),
});

export type HTTPValidationError = z.infer<typeof HTTPValidationError>;
export const HTTPValidationError = z.object({
    detail: z.array(ValidationError).optional(),
});

export type ImportGroupPayload = z.infer<typeof ImportGroupPayload>;
export const ImportGroupPayload = z.object({
    group_json: z.string(),
});

export type ImportGroupResponse = z.infer<typeof ImportGroupResponse>;
export const ImportGroupResponse = z.object({
    group_id: z.number(),
});

export type LoginPayload = z.infer<typeof LoginPayload>;
export const LoginPayload = z.object({
    username: z.string(),
    password: z.string(),
    session_name: z.string(),
});

export type NewAccount = z.infer<typeof NewAccount>;
export const NewAccount = z.object({
    type: AccountType,
    name: z.string(),
    description: z.union([z.string(), z.undefined()]).optional(),
    date_info: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
    deleted: z.union([z.boolean(), z.undefined()]).optional(),
    tags: z.union([z.array(z.string()), z.undefined()]).optional(),
    clearing_shares: z.union([z.record(z.string(), z.number()), z.undefined()]).optional(),
});

export type NewFile = z.infer<typeof NewFile>;
export const NewFile = z.object({
    filename: z.string(),
    mime_type: z.string(),
    content: z.string(),
});

export type NewTransactionPosition = z.infer<typeof NewTransactionPosition>;
export const NewTransactionPosition = z.object({
    name: z.string(),
    price: z.number(),
    communist_shares: z.number(),
    usages: z.record(z.string(), z.number()),
});

export type NewTransaction = z.infer<typeof NewTransaction>;
export const NewTransaction = z.object({
    type: TransactionType,
    name: z.string(),
    description: z.string(),
    value: z.number(),
    currency_identifier: z.string(),
    currency_conversion_rate: z.number(),
    billed_at: z.string(),
    tags: z.union([z.array(z.string()), z.undefined()]).optional(),
    creditor_shares: z.record(z.string(), z.number()),
    debitor_shares: z.record(z.string(), z.number()),
    new_files: z.union([z.array(NewFile), z.undefined()]).optional(),
    new_positions: z.union([z.array(NewTransactionPosition), z.undefined()]).optional(),
});

export type PersonalAccount = z.infer<typeof PersonalAccount>;
export const PersonalAccount = z.object({
    id: z.number(),
    group_id: z.number(),
    type: z.string(),
    name: z.string(),
    description: z.string(),
    deleted: z.boolean(),
    last_changed: z.string(),
});

export type PreviewGroupPayload = z.infer<typeof PreviewGroupPayload>;
export const PreviewGroupPayload = z.object({
    invite_token: z.string(),
    logged_in_user_token: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
});

export type RecoverPasswordPayload = z.infer<typeof RecoverPasswordPayload>;
export const RecoverPasswordPayload = z.object({
    email: z.string(),
});

export type RegisterPayload = z.infer<typeof RegisterPayload>;
export const RegisterPayload = z.object({
    username: z.string(),
    password: z.string(),
    email: z.string(),
    invite_token: z.union([z.union([z.string(), z.null()]), z.undefined()]).optional(),
});

export type RegisterResponse = z.infer<typeof RegisterResponse>;
export const RegisterResponse = z.object({
    user_id: z.number(),
});

export type RenameSessionPayload = z.infer<typeof RenameSessionPayload>;
export const RenameSessionPayload = z.object({
    session_id: z.number(),
    name: z.string(),
});

export type Session = z.infer<typeof Session>;
export const Session = z.object({
    id: z.number(),
    name: z.string(),
    valid_until: z.union([z.string(), z.null()]),
    last_seen: z.string(),
});

export type Token = z.infer<typeof Token>;
export const Token = z.object({
    user_id: z.number(),
    access_token: z.string(),
});

export type TransactionPosition = z.infer<typeof TransactionPosition>;
export const TransactionPosition = z.object({
    name: z.string(),
    price: z.number(),
    communist_shares: z.number(),
    usages: z.record(z.string(), z.number()),
    id: z.number(),
    deleted: z.boolean(),
});

export type Transaction = z.infer<typeof Transaction>;
export const Transaction = z.object({
    id: z.number(),
    group_id: z.number(),
    type: TransactionType,
    name: z.string(),
    description: z.string(),
    value: z.number(),
    currency_identifier: z.string(),
    currency_conversion_rate: z.number(),
    billed_at: z.string(),
    tags: z.array(z.string()),
    deleted: z.boolean(),
    creditor_shares: z.record(z.string(), z.number()),
    debitor_shares: z.record(z.string(), z.number()),
    last_changed: z.string(),
    positions: z.array(TransactionPosition),
    files: z.array(FileAttachment),
});

export type TransactionHistory = z.infer<typeof TransactionHistory>;
export const TransactionHistory = z.object({
    revision_id: z.number(),
    changed_by: z.number(),
    changed_at: z.string(),
});

export type UpdateFile = z.infer<typeof UpdateFile>;
export const UpdateFile = z.object({
    id: z.number(),
    filename: z.string(),
    deleted: z.boolean(),
});

export type UpdateGroupMemberOwnedAccountPayload = z.infer<typeof UpdateGroupMemberOwnedAccountPayload>;
export const UpdateGroupMemberOwnedAccountPayload = z.object({
    owned_account_id: z.union([z.number(), z.null()]),
});

export type UpdateGroupMemberPermissionsPayload = z.infer<typeof UpdateGroupMemberPermissionsPayload>;
export const UpdateGroupMemberPermissionsPayload = z.object({
    can_write: z.boolean(),
    is_owner: z.boolean(),
});

export type UpdatePositionsPayload = z.infer<typeof UpdatePositionsPayload>;
export const UpdatePositionsPayload = z.object({
    positions: z.array(TransactionPosition),
});

export type UpdateTransaction = z.infer<typeof UpdateTransaction>;
export const UpdateTransaction = z.object({
    type: TransactionType,
    name: z.string(),
    description: z.string(),
    value: z.number(),
    currency_identifier: z.string(),
    currency_conversion_rate: z.number(),
    billed_at: z.string(),
    tags: z.union([z.array(z.string()), z.undefined()]).optional(),
    creditor_shares: z.record(z.string(), z.number()),
    debitor_shares: z.record(z.string(), z.number()),
    new_files: z.union([z.array(NewFile), z.undefined()]).optional(),
    new_positions: z.union([z.array(NewTransactionPosition), z.undefined()]).optional(),
    changed_files: z.union([z.array(UpdateFile), z.undefined()]).optional(),
    changed_positions: z.union([z.array(TransactionPosition), z.undefined()]).optional(),
});

export type User = z.infer<typeof User>;
export const User = z.object({
    id: z.number(),
    username: z.string(),
    email: z.string(),
    registered_at: z.string(),
    deleted: z.boolean(),
    pending: z.boolean(),
    sessions: z.array(Session),
    is_guest_user: z.boolean(),
});

export type VersionResponse = z.infer<typeof VersionResponse>;
export const VersionResponse = z.object({
    version: z.string(),
    major_version: z.number(),
    minor_version: z.number(),
    patch_version: z.number(),
});
