-- migration: a8af5ed2
-- requires: da91bfe8

alter table tag drop constraint tag_group_id_fkey;
alter table tag add constraint tag_group_id_fkey foreign key (group_id) references grp(id) on delete cascade;

alter table transaction_to_tag drop constraint transaction_to_tag_tag_id_fkey;
alter table transaction_to_tag add constraint transaction_to_tag_tag_id_fkey foreign key (tag_id) references tag(id) on delete cascade;

alter table account_to_tag drop constraint account_to_tag_tag_id_fkey;
alter table account_to_tag add constraint account_to_tag_tag_id_fkey foreign key (tag_id) references tag(id) on delete cascade;
