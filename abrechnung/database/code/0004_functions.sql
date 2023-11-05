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

create or replace function account_state_valid_at(
    valid_at timestamptz = now()
)
    returns table (
        account_id         int,
        revision_id        bigint,
        type               text,
        changed_by         int,
        group_id           int,
        created_at         timestamptz,
        name               text,
        description        text,
        owning_user_id     int,
        date_info          date,
        deleted            bool,
        n_clearing_shares  int,
        clearing_shares    json,
        involved_accounts  int[],
        tags               varchar(255)[]
    )
as
$$
select distinct on (acah.account_id)
    acah.account_id,
    acah.revision_id,
    acah.type,
    acah.user_id,
    acah.group_id,
    acah.created_at,
    acah.name,
    acah.description,
    acah.owning_user_id,
    acah.date_info,
    acah.deleted,
    acah.n_clearing_shares,
    acah.clearing_shares,
    acah.involved_accounts,
    acah.tags
from
    aggregated_account_history acah
where
    acah.created_at <= account_state_valid_at.valid_at
order by
    acah.account_id, acah.created_at desc
$$ language sql
    security invoker
    stable;

create or replace function full_account_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                integer,
        type              text,
        group_id          integer,
        last_changed      timestamptz,
        changed_by        int,
        name              text,
        description       text,
        owning_user_id    int,
        date_info         date,
        deleted           bool,
        n_clearing_shares int,
        clearing_shares   json,
        involved_accounts int[],
        tags              varchar(255)[]
    )
    stable
    language sql
as
$$
select
    a.id,
    a.type,
    a.group_id,
    details.created_at as last_changed,
    details.changed_by,
    details.name,
    details.description,
    details.owning_user_id,
    details.date_info,
    details.deleted,
    details.n_clearing_shares,
    details.clearing_shares,
    details.involved_accounts,
    details.tags
from
    account a
    join account_state_valid_at(full_account_state_valid_at.valid_at) details on a.id = details.account_id
$$;

create or replace function file_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                  integer,
        revision_id         bigint,
        transaction_id      integer,
        changed_by          integer,
        created_at timestamptz,
        filename            text,
        mime_type           text,
        blob_id             integer,
        deleted             boolean
    )
    stable
    language sql
as
$$
select distinct on (id)
    id,
    revision_id,
    transaction_id,
    user_id as changed_by,
    created_at,
    filename,
    mime_type,
    blob_id,
    deleted
from
    aggregated_file_history
where
    created_at <= file_state_valid_at.valid_at
        and filename is not null
order by
    id, created_at desc
$$;

create or replace function transaction_position_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                      integer,
        revision_id             bigint,
        transaction_id          integer,
        changed_by              integer,
        created_at     timestamptz,
        name                    text,
        price                   double precision,
        communist_shares        double precision,
        deleted                 boolean,
        n_usages                integer,
        usages                  json,
        involved_accounts       integer[]
    )
    stable
    language sql
as
$$
select distinct on (acph.item_id)
    acph.item_id as id,
    acph.revision_id,
    acph.transaction_id,
    acph.user_id as changed_by,
    acph.created_at,
    acph.name,
    acph.price,
    acph.communist_shares,
    acph.deleted,
    acph.n_usages,
    acph.usages,
    acph.involved_accounts
from
    aggregated_transaction_position_history acph
where
    acph.created_at <= transaction_position_state_valid_at.valid_at
        and acph.name is not null
order by
    acph.item_id, acph.created_at desc
$$;

create or replace function transaction_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        revision_id              bigint,
        transaction_id           integer,
        changed_by               integer,
        created_at      timestamptz,
        group_id                 integer,
        type                     text,
        value                    double precision,
        currency_symbol          text,
        currency_conversion_rate double precision,
        name                     text,
        description              text,
        billed_at                date,
        deleted                  boolean,
        n_creditor_shares        integer,
        creditor_shares          json,
        n_debitor_shares         integer,
        debitor_shares           json,
        involved_accounts        integer[],
        tags                     varchar(255)[]
    )
    stable
    language sql
as
$$
select distinct on (acth.transaction_id)
    acth.revision_id,
    acth.transaction_id,
    acth.user_id as changed_by,
    acth.created_at,
    acth.group_id,
    acth.type,
    acth.value,
    acth.currency_symbol,
    acth.currency_conversion_rate,
    acth.name,
    acth.description,
    acth.billed_at,
    acth.deleted,
    acth.n_creditor_shares,
    acth.creditor_shares,
    acth.n_debitor_shares,
    acth.debitor_shares,
    acth.involved_accounts,
    acth.tags
from
    aggregated_transaction_history acth
where
    acth.created_at <= transaction_state_valid_at.valid_at
order by
    acth.transaction_id, acth.created_at desc
$$;

create or replace function full_transaction_state_valid_at(
    valid_at timestamp with time zone default now()
)
    returns table (
        id                          integer,
        type                        text,
        group_id                    integer,
        last_changed                timestamp with time zone,
        value                       double precision,
        currency_symbol             text,
        currency_conversion_rate    double precision,
        name                        text,
        description                 text,
        billed_at                   date,
        deleted                     boolean,
        n_creditor_shares           integer,
        creditor_shares             json,
        n_debitor_shares            integer,
        debitor_shares              json,
        involved_accounts           integer[],
        tags                        varchar(255)[],
        positions                   json,
        files                       json
    )
    stable
    language sql
as
$$
select
    t.id,
    t.type,
    t.group_id,
    greatest(
        details.created_at,
        aggregated_positions.created_at,
        aggregated_files.created_at
    ) as last_changed,
    details.value,
    details.currency_symbol,
    details.currency_conversion_rate,
    details.name,
    details.description,
    details.billed_at,
    details.deleted,
    details.n_creditor_shares,
    details.creditor_shares,
    details.n_debitor_shares,
    details.debitor_shares,
    details.involved_accounts,
    details.tags,
    coalesce(aggregated_positions.json_state, '[]'::json)    as positions,
    coalesce(aggregated_files.json_state, '[]'::json)        as files
from
    transaction t
    join
        transaction_state_valid_at(full_transaction_state_valid_at.valid_at) details on t.id = details.transaction_id
    left join (
        select
            ctpsa.transaction_id,
            json_agg(ctpsa)        as json_state,
            max(ctpsa.created_at) as created_at
        from
            transaction_position_state_valid_at(full_transaction_state_valid_at.valid_at) ctpsa
        group by ctpsa.transaction_id
    ) aggregated_positions on t.id = aggregated_positions.transaction_id
    left join (
        select
            cfsva.transaction_id,
            json_agg(cfsva)        as json_state,
            max(cfsva.created_at) as created_at
        from
            file_state_valid_at(full_transaction_state_valid_at.valid_at) cfsva
        group by cfsva.transaction_id
    ) aggregated_files on t.id = aggregated_files.transaction_id
$$;
