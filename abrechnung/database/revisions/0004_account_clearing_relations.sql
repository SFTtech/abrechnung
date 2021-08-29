
-- clearing relations between accounts.
-- accounts can be clearing accounts ("verrechnungskonto"),
-- temporary accounts whose balances are transferred to different accounts.
-- in Abrechnung, this balance transfer happens in a post-processing step:
-- first, all account balances are calculated according to the given
-- transactions.
-- then, accounts are cleared according to all clearing relations
-- e.g. the account balance from "spaghetti on wednsday" is transferred
-- in equal parts to the accounts "hans", "fritz", "elfriede", and the
-- account balance from "elfriede" is transferred to the account "fritz".
-- both "spaghetti on wednsday" and "elfriede" are clearing accounts,
-- no balance remains on them after clearing.
-- cycles between clearing accounts (e.g. "hans" clears to "fritz",
-- "fritz" clears to "elfriede" and "elfriede" clears to "hans" and "fritz"
-- are forbidden; if any are found, clearing is skipped, and commiting is
-- forbidden.
-- (cycles could in theory be resolved using linear algebra, but
--  neither comprehensibility nore numerical stability can be guaranteed).
create table if not exists account_clearing_relation (
    group_id integer not null references grp(id) on delete cascade,
    id serial primary key,

    -- the account that is cleared.
    source integer not null references account(id) on delete restrict,
    -- the account to which the balance is transferred.
    -- if destination == source, the given share is actually kept on this account.
    -- this can be used if e.g. only half of the account's balance should be cleared.
    destination integer not null references account(id) on delete restrict,

    constraint account_clearing_relation_source_destination_unique unique (source, destination)
);

create table if not exists account_clearing_relation_history (
    id integer references account(id) on delete restrict,
    revision_id bigint references account_revision(id) on delete cascade,
    primary key(id, revision_id),

    -- the number of shares of the source account's balance that
    -- should be cleared to this destination account.
    -- balance transferred to destination :=
    --   balance of source * (shares / (sum of all shares with this source))
    shares double precision not null,
    constraint account_clearing_relation_history_shares_nonnegative check (shares >= 0),
    description text not null default '',

    -- deleted can be set to true at any time
    deleted bool not null default false
);
