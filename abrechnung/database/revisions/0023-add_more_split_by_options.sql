-- migration: b59de5c4
-- requires: a8af5ed2

create type split_mode_t as enum ('shares', 'absolute', 'percent');

alter table transaction_history add column split_mode split_mode_t not null default 'shares';
