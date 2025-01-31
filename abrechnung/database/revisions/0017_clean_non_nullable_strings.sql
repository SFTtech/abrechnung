-- migration: 04424b59
-- requires: a83f4798

alter table transaction_history alter column description set default '';
alter table transaction_history alter column description set not null;

alter table grp alter column created_by set not null;
