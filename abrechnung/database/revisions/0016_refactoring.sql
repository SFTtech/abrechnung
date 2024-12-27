-- migration: a83f4798
-- requires: ee5d2b35

alter table session drop column token;

delete from transaction_revision where committed is null;
alter table transaction_revision drop column last_changed;
alter table transaction_revision drop column version;
alter table transaction_revision drop column started;
alter table transaction_revision rename column committed to created_at;
alter table transaction_revision alter column created_at set default now();

delete from account_revision where committed is null;
alter table account_revision drop column last_changed;
alter table account_revision drop column version;
alter table account_revision drop column started;
alter table account_revision rename column committed to created_at;
alter table account_revision alter column created_at set default now();
