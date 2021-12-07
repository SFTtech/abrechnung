-- revision: a77c9b57
-- requires: 64df13c9

alter table purchase_item drop constraint purchase_item_transaction_id_fkey;
alter table purchase_item add constraint purchase_item_transaction_id_fkey foreign key (transaction_id) references transaction(id) on delete cascade;

alter table purchase_item_history drop constraint purchase_item_history_id_fkey;
alter table purchase_item_history add constraint purchase_item_history_id_fkey foreign key (id) references purchase_item(id) on delete cascade;

alter table purchase_item_usage drop constraint purchase_item_usage_item_id_fkey;
alter table purchase_item_usage add constraint purchase_item_usage_item_id_fkey foreign key (item_id) references purchase_item(id) on delete cascade;

alter table purchase_item_usage drop constraint purchase_item_usage_account_id_fkey;
alter table purchase_item_usage add constraint purchase_item_usage_account_id_fkey foreign key (account_id) references account(id) on delete cascade;
