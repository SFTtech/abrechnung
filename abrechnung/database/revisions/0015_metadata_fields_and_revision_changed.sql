-- migration: ee5d2b35
-- requires: 174ef0fc

alter table account_revision
    add column last_changed timestamptz;
update account_revision
set
    last_changed = coalesce(committed, started);
alter table account_revision
    alter column last_changed set not null;
alter table account_revision
    alter column last_changed set default now();

alter table transaction_revision
    add column last_changed timestamptz;
update transaction_revision
set
    last_changed = coalesce(committed, started);
alter table transaction_revision
    alter column last_changed set not null;
alter table transaction_revision
    alter column last_changed set default now();

create table tag (
    id       serial primary key,
    group_id integer      not null references grp (id),
    name     varchar(255) not null,
    unique (group_id, name)
);

create table transaction_to_tag (
    transaction_id integer not null references transaction (id),
    revision_id    bigint  not null references transaction_revision (id),
    tag_id         integer not null references tag (id),
    primary key (transaction_id, revision_id, tag_id)
);

alter table transaction_history
    rename column description to name;
alter table transaction_history
    add column description text;

alter table account_history
    drop column priority;

alter table account_history
    add column date_info date;


create table account_to_tag (
    account_id  integer not null references account (id),
    revision_id bigint  not null references account_revision (id),
    tag_id      integer not null references tag (id),
    primary key (account_id, revision_id, tag_id)
);
