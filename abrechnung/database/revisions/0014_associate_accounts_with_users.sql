-- revision: 174ef0fc
-- requires: c019dd21

alter table grp add column add_user_account_on_join boolean default false not null;

alter table account_history add column owning_user_id integer references usr(id);
