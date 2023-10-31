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

create or replace function full_account_state_valid_at(
    seen_by_user integer, valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        account_id        integer,
        type              text,
        group_id          integer,
        last_changed      timestamptz,
        is_wip            boolean,
        committed_details jsonb,
        pending_details   jsonb
    )
    stable
    language sql
as
$$
select
    a.id                                                                   as account_id,
    a.type,
    a.group_id,
    greatest(committed_details.last_changed, pending_details.last_changed) as last_changed,
    exists(select
               1
           from
               account_revision ar
           where
                   ar.account_id = a.id
               and ar.user_id = full_account_state_valid_at.seen_by_user
               and ar.committed is null)                                   as is_wip,
    committed_details.json_state                                           as committed_details,
    pending_details.json_state                                             as pending_details
from
    account a
    left join (
        select
            casa.account_id,
            jsonb_agg(casa)        as json_state,
            max(casa.last_changed) as last_changed
        from
            committed_account_state_valid_at(full_account_state_valid_at.valid_at) casa
        group by casa.account_id
              ) committed_details on a.id = committed_details.account_id
    left join (
        select
            apah.account_id,
            jsonb_agg(apah)        as json_state,
            max(apah.last_changed) as last_changed
        from
            aggregated_pending_account_history apah
        where
                apah.changed_by = full_account_state_valid_at.seen_by_user
        group by apah.account_id
              ) pending_details on a.id = pending_details.account_id
where
    committed_details.json_state is not null
    or pending_details.json_state is not null
$$;

create or replace function committed_file_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        file_id            integer,
        revision_id        bigint,
        transaction_id     integer,
        changed_by         integer,
        revision_started   timestamptz,
        revision_committed timestamptz,
        last_changed       timestamptz,
        filename           text,
        mime_type          text,
        blob_id            integer,
        deleted            boolean
    )
    stable
    language sql
as
$$
select distinct on (file_id)
    file_id,
    revision_id,
    transaction_id,
    user_id as changed_by,
    revision_started,
    revision_committed,
    last_changed,
    filename,
    mime_type,
    blob_id,
    deleted
from
    aggregated_committed_file_history
where
        revision_committed <= committed_file_state_valid_at.valid_at
    and filename is not null
order by
    file_id, revision_committed desc
$$;

create or replace function committed_transaction_position_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        item_id            integer,
        revision_id        bigint,
        transaction_id     integer,
        changed_by         integer,
        revision_started   timestamptz,
        revision_committed timestamptz,
        last_changed       timestamptz,
        name               text,
        price              double precision,
        communist_shares   double precision,
        deleted            boolean,
        n_usages           integer,
        usages             jsonb,
        involved_accounts  integer[]
    )
    stable
    language sql
as
$$
select distinct on (acph.item_id)
    acph.item_id,
    acph.revision_id,
    acph.transaction_id,
    acph.user_id as changed_by,
    acph.revision_started,
    acph.revision_committed,
    acph.last_changed,
    acph.name,
    acph.price,
    acph.communist_shares,
    acph.deleted,
    acph.n_usages,
    acph.usages,
    acph.involved_accounts
from
    aggregated_committed_transaction_position_history acph
where
        acph.revision_committed <= committed_transaction_position_state_valid_at.valid_at
    and acph.name is not null
order by
    acph.item_id, acph.revision_committed desc
$$;

create or replace function committed_transaction_state_valid_at(
    valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        revision_id              bigint,
        transaction_id           integer,
        changed_by               integer,
        revision_started         timestamptz,
        revision_committed       timestamptz,
        last_changed             timestamptz,
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
        creditor_shares          jsonb,
        n_debitor_shares         integer,
        debitor_shares           jsonb,
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
    acth.revision_started,
    acth.revision_committed,
    acth.last_changed,
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
    aggregated_committed_transaction_history acth
where
        acth.revision_committed <= committed_transaction_state_valid_at.valid_at
order by
    acth.transaction_id, acth.revision_committed desc
$$;

create or replace function full_transaction_state_valid_at(
    seen_by_user integer, valid_at timestamp with time zone DEFAULT now()
)
    returns TABLE (
        transaction_id      integer,
        type                text,
        group_id            integer,
        last_changed        timestamp with time zone,
        is_wip              boolean,
        committed_details   jsonb,
        pending_details     jsonb,
        committed_positions jsonb,
        pending_positions   jsonb,
        committed_files     jsonb,
        pending_files       jsonb
    )
    stable
    language sql
as
$$
select
    t.id                                                                                               as transaction_id,
    t.type,
    t.group_id,
    greatest(committed_details.last_changed, committed_positions.last_changed, committed_files.last_changed,
             pending_details.last_changed, pending_positions.last_changed, pending_files.last_changed) as last_changed,
    exists(select
               1
           from
               transaction_revision tr
           where
                   tr.transaction_id = t.id
               and tr.user_id = full_transaction_state_valid_at.seen_by_user
               and tr.committed is null)                                                               as is_wip,
    committed_details.json_state                                                                       as committed_details,
    pending_details.json_state                                                                         as pending_details,
    committed_positions.json_state                                                                     as committed_positions,
    pending_positions.json_state                                                                       as pending_positions,
    committed_files.json_state                                                                         as committed_files,
    pending_files.json_state                                                                           as pending_files
from
    transaction t
    left join (
        select
            ctsa.transaction_id,
            jsonb_agg(ctsa)        as json_state,
            max(ctsa.last_changed) as last_changed
        from
            committed_transaction_state_valid_at(full_transaction_state_valid_at.valid_at) ctsa
        group by ctsa.transaction_id
              ) committed_details on t.id = committed_details.transaction_id
    left join (
        select
            apth.transaction_id,
            jsonb_agg(apth)        as json_state,
            max(apth.last_changed) as last_changed
        from
            aggregated_pending_transaction_history apth
        where
                apth.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apth.transaction_id
              ) pending_details on t.id = pending_details.transaction_id
    left join (
        select
            ctpsa.transaction_id,
            jsonb_agg(ctpsa)        as json_state,
            max(ctpsa.last_changed) as last_changed
        from
            committed_transaction_position_state_valid_at(full_transaction_state_valid_at.valid_at) ctpsa
        group by ctpsa.transaction_id
              ) committed_positions on t.id = committed_positions.transaction_id
    left join (
        select
            aptph.transaction_id,
            jsonb_agg(aptph)        as json_state,
            max(aptph.last_changed) as last_changed
        from
            aggregated_pending_transaction_position_history aptph
        where
                aptph.changed_by = full_transaction_state_valid_at.seen_by_user
        group by aptph.transaction_id
              ) pending_positions on t.id = pending_positions.transaction_id
    left join (
        select
            cfsva.transaction_id,
            jsonb_agg(cfsva)        as json_state,
            max(cfsva.last_changed) as last_changed
        from
            committed_file_state_valid_at(full_transaction_state_valid_at.valid_at) cfsva
        group by cfsva.transaction_id
              ) committed_files on t.id = committed_files.transaction_id
    left join (
        select
            apfh.transaction_id,
            jsonb_agg(apfh)        as json_state,
            max(apfh.last_changed) as last_changed
        from
            aggregated_pending_file_history apfh
        where
                apfh.changed_by = full_transaction_state_valid_at.seen_by_user
        group by apfh.transaction_id
              ) pending_files on t.id = pending_files.transaction_id
where
    committed_details.json_state is not null
    or pending_details.json_state is not null
$$;
