-- migration: da91bfe8
-- requires: b16c7901

alter table group_membership add column owned_account_id bigint references account(id);
