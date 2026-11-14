-- migration: 632547fd
-- requires: b59de5c4

-- the group chat feature is removed, drop its entries and the type
delete from group_log where type = 'text-message';
delete from group_log_type where name = 'text-message';

insert into group_log_type (name) values
    ('transaction-created'),
    ('transaction-updated'),
    ('account-created'),
    ('account-updated'),
    ('event-created'),
    ('event-updated'),
    ('event-deleted'),
    ('member-left')
on conflict do nothing;

-- log entries now reference the item they describe (if any) and carry a small
-- snapshot of its data (e.g. name, value) so they stay readable after the item
-- was renamed or deleted
alter table group_log add column transaction_id integer references transaction (id) on delete set null;
alter table group_log add column account_id integer references account (id) on delete set null;
alter table group_log add column data jsonb not null default '{}'::jsonb;

create index group_log_group_id_id_idx on group_log (group_id, id desc);

-- Until now only account changes and transaction deletions were logged, as free text without reference to
-- the item. Rebuild the entries for transactions and accounts / events from their revision history, this
-- results in complete entries (with reference and data snapshot) for everything that ever happened.
-- Entries are re-inserted ordered by time so that ids stay chronological (the log is paginated by id).
create temporary table tmp_group_log as
select
    group_id, user_id, logged_at, type, message, affected, transaction_id, account_id, data, id as sort_id
from group_log
where type not in ('transaction-committed', 'transaction-deleted', 'account-committed', 'account-deleted');

delete from group_log;

insert into tmp_group_log (group_id, user_id, logged_at, type, message, affected, transaction_id, account_id, data, sort_id)
select
    t.group_id,
    r.user_id,
    r.created_at,
    case
        when th.deleted then 'transaction-deleted'
        when r.id = first_value(r.id) over (partition by r.transaction_id order by r.created_at, r.id) then 'transaction-created'
        else 'transaction-updated'
    end,
    '',
    null,
    t.id,
    null,
    jsonb_build_object(
        'name', th.name, 'type', t.type, 'value', th.value, 'currency_identifier', th.currency_identifier
    ),
    r.id
from transaction_revision r
join transaction t on t.id = r.transaction_id
join transaction_history th on th.id = r.transaction_id and th.revision_id = r.id;

insert into tmp_group_log (group_id, user_id, logged_at, type, message, affected, transaction_id, account_id, data, sort_id)
select
    a.group_id,
    r.user_id,
    r.created_at,
    -- accounts and events (clearing accounts) are logged as separate types
    case when a.type = 'clearing' then 'event' else 'account' end
    || case
        when ah.deleted then '-deleted'
        when r.id = first_value(r.id) over (partition by r.account_id order by r.created_at, r.id) then '-created'
        else '-updated'
    end,
    '',
    null,
    null,
    a.id,
    jsonb_build_object('name', ah.name, 'type', a.type),
    r.id
from account_revision r
join account a on a.id = r.account_id
join account_history ah on ah.id = r.account_id and ah.revision_id = r.id;

insert into group_log (group_id, user_id, logged_at, type, message, affected, transaction_id, account_id, data)
select group_id, user_id, logged_at, type, message, affected, transaction_id, account_id, data
from tmp_group_log
order by logged_at, sort_id;

drop table tmp_group_log;
