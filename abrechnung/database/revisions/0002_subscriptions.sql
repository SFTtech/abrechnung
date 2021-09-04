-- revision: 83a50a30
-- requires: 62df6b55

-- functions for managing websocket connections
-- these should be used by the websocket forwarder

-- creates a row in the forwarder table (if not exists)
-- listens to channel
-- returns channel_id (use as f"channel{channel_id}" when listening!)
create or replace function forwarder_boot(
    id text, out channel_id bigint
) as
$$
<<locals>> declare
    channel_number forwarder.channel_id%type;
begin
    -- check if this forwarder is already connected
    select forwarder.channel_id into locals.channel_number from forwarder where forwarder.id = forwarder_boot.id;

    -- either register the new forwarder
    if locals.channel_number is null then
        insert into forwarder (
            id
        )
        values (
            forwarder_boot.id
        )
        returning forwarder.channel_id into locals.channel_number;
    else -- or get rid of potential old entries of a re-booted forwarder
    -- (these are left over if a forwarder crashes)
        delete
        from
            connection
        where
                connection.channel_id in (
                select forwarder.channel_id from forwarder where forwarder.id = forwarder_boot.id
                                         );
    end if;

    forwarder_boot.channel_id := locals.channel_number;
end
$$ language plpgsql;

-- to be called by a forwarder whenever a new client connects to it via websocket.
-- creates a row in the connection table,
-- so we know under what channel this client is reachable.
-- returns connection_id
create or replace function client_connected(
    channel_id integer, out connection_id bigint
) as
$$
begin
    insert into connection (
        channel_id
    )
    values (
        client_connected.channel_id
    )
    returning id into client_connected.connection_id;
end
$$ language plpgsql;

-- to be called by a forwarder whenever a websocket connection is closed
-- deletes the row in the connection table
-- raises bad-connection-id if the connection has not existed
create or replace procedure client_disconnected(
    connection_id bigint
) as
$$
begin
    delete from connection where connection.id = client_disconnected.connection_id;

    if not found then raise exception 'bad-connection-id:no connection with the given connection id'; end if;

    -- ON DELETE CASCADE actions will take care of cleaning up the connection and subscriptions
end
$$ language plpgsql;

-- to be called by a forwarder when it shuts down
-- deletes all associated channels
-- returns the number of channels that were terminated
create or replace function forwarder_stop(
    id text, out deleted_connections integer
) returns integer as
$$
begin
    delete
    from
        connection
    where
            connection.channel_id in (
            select channel_id
            from forwarder
            where forwarder.id = forwarder_stop.id
                                     );

    get diagnostics forwarder_stop.deleted_connections = row_count;

    delete from forwarder where forwarder.id = forwarder_stop.id;

    -- ON DELETE CASCADE actions will take care of cleaning up the connections and subscriptions
end
$$ language plpgsql;

-------------------------------------------------------------------------------
-- event subscriptions


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


-- sends a notification with 'data' to the given clients
create or replace procedure notify_connections(
    connection_ids bigint[], event text, data json
) as
$$
<<locals>> declare
    forwarder_info record;
begin
    for forwarder_info in select
                              concat('channel', connection.channel_id) as channel_name,
                              array_agg(connection.id)                 as connections
                          from
                              connection
                          where
                              connection.id = any (notify_connections.connection_ids)
                          group by connection.channel_id loop
        perform pg_notify(forwarder_info.channel_name,
                          json_build_object('connections', forwarder_info.connections, 'event', event, 'data',
                                            data)::text);
    end loop;
end
$$ language plpgsql;

-- sends a notification with 'data' to the calling client
-- allows clients to test the notification system
create or replace procedure notify_me(
    connection_id bigint, event text, data json
) as
$$
begin
    call notify_connections(ARRAY [connection_id], event, data);
end
$$ language plpgsql;

-- functions for event subscription management
-- called by the client so it receives change-events

-- subscribe user of given token to notifications
create or replace procedure subscribe(
    connection_id bigint,
    user_id integer,
    subscription_type text,
    element_id bigint
) as
$$
begin
    if subscribe.element_id is null then raise exception 'invalid element_id value'; end if;

    -- type-specific permission/value checks
    if subscribe.subscription_type = 'test' then
        -- only allow element_id == user_id
        if subscribe.element_id != subscribe.user_id then raise 'test requires correct element_id'; end if;

    elseif subscribe.subscription_type = 'user' then
    -- but the element we watch has to be the user id
        if subscribe.element_id != subscribe.user_id then raise 'element_id not logged in user user'; end if;

    elseif subscribe.subscription_type = 'group' then
        if subscribe.element_id != subscribe.user_id then
            raise 'bad-subscription:group: element_id not token user';
        end if; -- Rewrite this since practically every notification apart from a few is group based such that we normally perform

    -- the group auth instead of the normal auth
    elseif subscribe.subscription_type in ('account', 'group_member', 'group_invite', 'group_log', 'transaction') then
        perform
        from group_membership gm
        where gm.user_id = subscribe.user_id and gm.group_id = subscribe.element_id::integer;
        if not found then
            raise 'user % tried to subscribe to changes in a group without being a member', subscribe.user_id;
        end if;

    else
        raise exception 'unknown subscription type';
    end if;

    insert into subscription (
        connection_id, user_id, subscription_type, element_id
    )
    values (
        subscribe.connection_id,
        subscribe.user_id,
        subscribe.subscription_type,
        subscribe.element_id
    )
    on conflict on constraint subscription_conn_type_elem do update set user_id = subscribe.user_id;
end
$$ language plpgsql;

-- unsubscribe user of given token to notifications
-- if the user could create the subscription on the connection_id,
-- he can also remove it.
create or replace procedure unsubscribe(
    connection_id bigint,
    user_id integer,
    subscription_type text,
    element_id bigint
) as
$$
begin
    delete
    from
        subscription
    where
        subscription.connection_id = unsubscribe.connection_id
        and subscription.subscription_type = unsubscribe.subscription_type
        and subscription.element_id = unsubscribe.element_id
        and subscription.user_id = unsubscribe.user_id;
end
$$ language plpgsql;

-- deliver a notification of given type
-- to all subscribers
create or replace procedure notify_user(
    subscription_type text,
    user_id subscription.user_id%TYPE,
    element_id subscription.element_id%TYPE,
    data json
) as
$$
<<locals>> declare
    connections bigint[];
begin
    -- this query directly uses the subscription_deliver_idx
    select
        array_agg(connection_id)
    into locals.connections
    from
        subscription
    where
        subscription.subscription_type = notify_user.subscription_type
        and notify_user.user_id = subscription.user_id
        and notify_user.element_id = subscription.element_id;

    call notify_connections(locals.connections, notify_user.subscription_type::text, notify_user.data);
end;
$$ language plpgsql;

create or replace procedure notify_users(
    subscription_type text,
    user_ids int[],
    element_id subscription.element_id%TYPE,
    data json
) as
$$
<<locals>> declare
    connections bigint[];
begin
    -- this query directly uses the subscription_deliver_idx
    select
        array_agg(connection_id)
    into locals.connections
    from
        subscription
    where
        subscription.subscription_type = notify_users.subscription_type
        and subscription.user_id = any (notify_users.user_ids)
        and notify_users.element_id = subscription.element_id;

    call notify_connections(locals.connections, notify_users.subscription_type::text, notify_users.data);
end;
$$ language plpgsql;

-- deliver a notification of given type to all users of a group
create or replace procedure notify_group(
    subscription_type text,
    group_id grp.id%TYPE,
    element_id subscription.element_id%TYPE,
    data json
) as
$$
<<locals>> declare
    user_ids int[];
begin
    select
        array_agg(gm.user_id)
    into locals.user_ids
    from
        group_membership gm
    where
        gm.group_id = notify_group.group_id
    group by gm.group_id;

    if locals.user_ids is null then return; end if;

    call notify_users(notify_group.subscription_type, locals.user_ids, notify_group.element_id, notify_group.data);
end;
$$ language plpgsql;



--------------------------------------------------------
-- Triggers to actually perform the notifications

-- notifications for changes in transactions
create or replace function transaction_history_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
        where
            transaction.id = OLD.id;
    else
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
        where
            transaction.id = NEW.id;
    end if;

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists transaction_history_update_trig on transaction_history;
create trigger transaction_history_update_trig
    after insert or update or delete
    on transaction_history
    for each row
execute function transaction_history_updated();
-- TODO: the very complicated stuff of transaction share updates

-- notifications for changes in creditor or debitor shares
create or replace function transaction_share_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
        join transaction_history th on transaction.id = th.id
        where th.revision_id = OLD.revision_id and th.id = OLD.transaction_id;
    else
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
            join transaction_history th on transaction.id = th.id
        where th.revision_id = NEW.revision_id and th.id = NEW.transaction_id;
    end if;

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists creditor_share_trig on creditor_share;
create trigger creditor_share_trig
    after insert or update or delete
    on creditor_share
    for each row
execute function transaction_share_updated();

drop trigger if exists debitor_share_trig on debitor_share;
create trigger debitor_share_trig
    after insert or update or delete
    on debitor_share
    for each row
execute function transaction_share_updated();

-- notifications for committing
create or replace function transaction_revision_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null or NEW.committed is null then
        return null;
    end if;

    select
        transaction.group_id,
        transaction.id
    into locals.group_id, locals.transaction_id
    from
        transaction
        join transaction_history th on transaction.id = th.id
    where th.revision_id = NEW.id;

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

drop trigger if exists transaction_revision_trig on transaction_revision;
create trigger transaction_revision_trig
    after insert or update or delete
    on transaction_revision
    for each row
execute function transaction_revision_updated();

-- notifications for changes in accounts
create or replace function account_history_updated() returns trigger as
$$
<<locals>> declare
    group_id   grp.id%TYPE;
    account_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then
        select account.group_id, account.id
        into locals.group_id, locals.account_id
        from account
        where account.id = OLD.id;
    else
        select account.group_id, account.id
        into locals.group_id, locals.account_id
        from account
        where account.id = NEW.id;
    end if;

    call notify_group('account', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'account_id', locals.account_id));
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists account_history_update_trig on account_history;
create trigger account_history_update_trig
    after insert or update or delete
    on account_history
    for each row
execute function account_history_updated();

-- notifications for changes in group memberships
create or replace function group_updated() returns trigger as
$$
begin
    if NEW is null then -- we cannot infer the group memberships after a group has been deleted
        return NULL;
    end if;

    call notify_group('group', NEW.id, NEW.id::bigint, json_build_object('element_id', NEW.id));
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists group_update_trig on grp;
create trigger group_update_trig
    after insert or update
    on grp
    for each row
execute function group_updated();

create or replace function group_deleted() returns trigger as
$$
<<locals>> declare
    user_info record;
begin
    for user_info in select
                          user_id
                      from
                          group_membership gm
                      where
                          gm.group_id = OLD.id loop
        call notify_user('group', user_info.user_id, user_info.user_id::bigint, json_build_object('element_id', user_info.user_id));
    end loop;

    return OLD;
end;
$$ language plpgsql;

drop trigger if exists group_delete_trig on grp;
create trigger group_delete_trig
    before delete
    on grp
    for each row
execute function group_deleted();

-- notifications for changes in sessions
create or replace function session_updated() returns trigger as
$$
begin
    if NEW is null then
        call notify_user('session', OLD.user_id, OLD.user_id::bigint,
                         json_build_object('element_id', OLD.user_id, 'session_id', OLD.id));
    else
        call notify_user('session', NEW.user_id, NEW.user_id::bigint,
                         json_build_object('element_id', NEW.user_id, 'session_id', NEW.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists session_update_trig on session;
create trigger session_update_trig
    after insert or update or delete
    on session
    for each row
execute function session_updated();

-- notifications for changes in group memberships
create or replace function group_membership_updated() returns trigger as
$$
begin
    if NEW is null then
        call notify_group('group_member', OLD.group_id, OLD.group_id::bigint,
                          json_build_object('element_id', OLD.group_id, 'user_id', OLD.user_id));
    else
        call notify_user('group', NEW.user_id, NEW.user_id::bigint,
                         json_build_object('element_id', NEW.user_id, 'group_id', NEW.group_id));
        call notify_group('group_member', NEW.group_id, NEW.group_id::bigint,
                          json_build_object('element_id', NEW.group_id, 'user_id', NEW.user_id));
    end if;

    return NULL;
end;
$$ language plpgsql;

drop trigger if exists group_membership_update_trig on group_membership;
create trigger group_membership_update_trig
    after insert or update or delete
    on group_membership
    for each row
execute function group_membership_updated();

-- notifications for changes in group invites
create or replace function group_invite_updated() returns trigger as
$$
begin
    --     raise 'notifying group invite for element id % and group_id %', NEW.id, NEW.group_id;
    if NEW is null then
        call notify_group('group_invite', OLD.group_id, OLD.group_id::bigint,
                          json_build_object('element_id', OLD.group_id, 'invite_id', OLD.id));
    else
        call notify_group('group_invite', NEW.group_id, NEW.group_id::bigint,
                          json_build_object('element_id', NEW.group_id, 'invite_id', NEW.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists group_invite_update_trig on group_invite;
create trigger group_invite_update_trig
    after insert or update or delete
    on group_invite
    for each row
execute function group_invite_updated();

-- notifications for changes in sessions
create or replace function user_sessions_updated() returns trigger as
$$
begin
    --     raise 'notifying group invite for element id % and group_id %', NEW.id, NEW.group_id;
    if NEW is null then
        call notify_user('user', OLD.user_id, OLD.user_id::bigint,
                          json_build_object('element_id', OLD.user_id, 'session_id', OLD.id));
    else
        call notify_user('user', NEW.user_id, NEW.user_id::bigint,
                          json_build_object('element_id', NEW.user_id, 'session_id', NEW.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists session_update_trig on session;
create trigger session_update_trig
    after insert or update or delete
    on session
    for each row
execute function user_sessions_updated();

-- notifications for changes in a users profile details
create or replace function user_updated() returns trigger as
$$
begin
    --     raise 'notifying group invite for element id % and group_id %', NEW.id, NEW.group_id;
    if NEW is null then
        call notify_user('user', OLD.id, OLD.id::bigint,
                         json_build_object('element_id', OLD.id));
    else
        call notify_user('user', NEW.id, NEW.id::bigint,
                         json_build_object('element_id', NEW.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists user_update_trig on usr;
create trigger user_update_trig
    after update
    on usr
    for each row
execute function user_updated();

-- notifications for changes in group logs entries
create or replace function group_log_updated() returns trigger as
$$
begin
    --     raise 'notifying group invite for element id % and group_id %', NEW.id, NEW.group_id;
    if NEW is null then
        call notify_group('group_log', OLD.group_id, OLD.group_id::bigint,
                          json_build_object('element_id', OLD.group_id, 'log-id', OLD.id));
    else
        call notify_group('group_log', NEW.group_id, NEW.group_id::bigint,
                          json_build_object('element_id', NEW.group_id, 'log_id', NEW.id));
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists group_log_update_trig on group_log;
create trigger group_log_update_trig
    after insert or update or delete
    on group_log
    for each row
execute function group_log_updated();
