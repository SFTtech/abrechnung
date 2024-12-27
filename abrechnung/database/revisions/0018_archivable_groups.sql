-- migration: 2467f144
-- requires: 04424b59

alter table grp add column archived boolean not null default false;

alter table grp add column last_changed timestamptz;
update grp set last_changed = created_at;
alter table grp alter column last_changed set not null;
alter table grp alter column last_changed set default now();
