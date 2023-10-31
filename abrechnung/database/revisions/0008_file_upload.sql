-- revision: 156aef63
-- requires: dbcccb58

create table if not exists blob (
    id        serial primary key,
    content   bytea not null,
    mime_type text not null
);

create table if not exists file (
    id             serial primary key,
    transaction_id integer not null references transaction (id) on delete cascade
);

create table if not exists file_history (
    id             integer references file(id) on delete cascade,
    revision_id    bigint not null references transaction_revision (id) on delete cascade,
    primary key (id, revision_id),
    filename       text not null,
    blob_id        integer references blob(id) on delete cascade,
    deleted        bool default false
);
