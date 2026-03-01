-- migration: 42ad15f8
-- requires: b59de5c4

delete from group_log
where type = 'transaction-committed' or type = 'transaction-deleted' or type = 'account-committed' or type = 'account-deleted' or type = 'text-message';

alter table group_log add column info jsonb;

-- transfer group_log entries to json -> with type field

alter table group_log alter column info set not null;
