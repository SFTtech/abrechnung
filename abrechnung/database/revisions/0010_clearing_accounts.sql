-- revision: c85ea20c
-- requires: bf5fbd44

insert into account_type (name) values ('clearing');

create table if not exists clearing_account_share (
    account_id int not null references account(id),
    revision_id bigint not null references account_revision(id),
    share_account_id int not null references account(id),
    primary key (account_id, revision_id, share_account_id),

    shares double precision not null
);
