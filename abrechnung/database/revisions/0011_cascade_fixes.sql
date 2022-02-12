-- revision: f6c9ff0b
-- requires: c85ea20c

alter table clearing_account_share drop constraint clearing_account_share_account_id_fkey;
alter table clearing_account_share add constraint clearing_account_share_account_id_fkey foreign key (account_id) references account(id) on delete cascade;
alter table clearing_account_share drop constraint clearing_account_share_revision_id_fkey;
alter table clearing_account_share add constraint clearing_account_share_revision_id_fkey foreign key (revision_id) references account_revision(id) on delete cascade;
alter table clearing_account_share drop constraint clearing_account_share_share_account_id_fkey;
alter table clearing_account_share add constraint clearing_account_share_share_account_id_fkey foreign key (share_account_id) references account(id) on delete cascade;
