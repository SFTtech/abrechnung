-- migration: da91bfe8
-- requires: b16c7901

alter table group_membership add column owned_account_id bigint references account(id);

-- fix missing not null constraint
alter table account_revision alter column account_id set not null;
