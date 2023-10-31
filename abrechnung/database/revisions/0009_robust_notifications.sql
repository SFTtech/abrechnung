-- revision: bf5fbd44
-- requires: 156aef63

alter table transaction_revision add column version int default 0;
alter table account_revision add column version int default 0;