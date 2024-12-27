-- migration: 83a50a30
-- requires: 62df6b55

-- which table or event variant is a subscription for.
create table if not exists subscription_type (
    name text not null primary key
);
insert into subscription_type (
    name
)
values (
    -- test subscription
    -- element_id: also a test value
    'test'
), (

    -- when sessions of a logged-in user are watched to see changes to logins
    -- the current sessions are then fetched with list_sessions
    -- element_id: the user whose sessions we wanna watch
    'user'
), (
    -- element_id: the user whose groups we wanna watch
    'group'
),(
    -- element_id: the group whose accounts we want to watch
    'account'
),(
    -- element_id: the group whose members we want to watch
    'group_member'
),(
    -- element_id: the group whose invites we want to watch
    'group_invite'
),(
    -- element_id: the group whose log we want to watch
    'group_log'
),(
    -- element_id: the group whose transactions we want to watch
    'transaction'
);

-- tracking of update subscriptions
-- so we know which connection_id on which forwarder channel gets some update.
--
-- entries in here have to be validated when the subscription is requested -
-- so nobody can subscribe on unallowed things.
create table if not exists subscription (
    -- the connection this subscription is assigned to
    connection_id     bigint  not null references connection (id) on delete cascade,

    -- which user has this subscription
    -- this is not for permission checks, these happen when the subscription is requested.
    -- instead its for convenience to figure out the user quickly.
    --
    -- relevant e.g. for viewing uncommitted changes or session token listing
    -- but irrelevant e.g. for group content, so only the editing user can get
    -- the update.
    --
    -- some notifications are for one user (hence we need his id, e.g. for sessions)
    -- and others are for one element (hence the element_id, e.g. for a transaction).
    -- for the wip-commits, the enclosing einkauf should only be subscribable to the editing user's session,
    -- but if that wasn't enforced, that notification would need user and element.
    user_id           integer not null references usr (id) on delete cascade,
    -- what data to subscribe to
    subscription_type text    not null references subscription_type (name) on delete restrict,
    -- what element of the data to subscribe to
    element_id        bigint  not null,

    -- on one connection there can't be multiple user_ids for a type+element
    -- also an index for notification removal
    constraint subscription_conn_type_elem unique (connection_id, subscription_type, element_id)
);
-- notification delivery
create index subscription_deliver_idx on subscription (user_id, subscription_type, element_id) include (connection_id);
