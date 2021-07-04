-- functions for managing websocket connections
-- these should be used by the websocket forwarder

-- creates a row in the forwarder table (if not exists)
-- listens to channel
-- returns channel_id (use as f"channel{channel_id}" when listening!)
create or replace function forwarder_boot(id text, out channel_id bigint)
as $$
<<locals>>
declare
    channel_number forwarder.channel_id%type;
begin
    -- check if this forwarder is already connected
    select forwarder.channel_id
        into locals.channel_number
            from forwarder
            where forwarder.id = forwarder_boot.id;

    -- either register the new forwarder
    if locals.channel_number is null then
        insert into forwarder (id)
            values (forwarder_boot.id)
            returning forwarder.channel_id into locals.channel_number;
    else
        -- or get rid of potential old entries of a re-booted forwarder
        -- (these are left over if a forwarder crashes)
        delete from connection
            where connection.channel_id in (
                select forwarder.channel_id from forwarder
                where forwarder.id = forwarder_boot.id
            );
    end if;

    forwarder_boot.channel_id := locals.channel_number;
end
$$ language plpgsql;

-- to be called by a forwarder whenever a new client connects to it via websocket.
-- creates a row in the connection table,
-- so we know under what channel this client is reachable.
-- returns connection_id
create or replace function client_connected(channel_id integer, out connection_id bigint)
as $$
begin
    insert into connection (channel_id)
        values (client_connected.channel_id)
        returning id into client_connected.connection_id;
end
$$ language plpgsql;

-- to be called by a forwarder whenever a websocket connection is closed
-- deletes the row in the connection table
-- raises bad-connection-id if the connection has not existed
create or replace procedure client_disconnected(connection_id bigint)
as $$
begin
    delete from connection
        where connection.id = client_disconnected.connection_id;

    if not found then
        raise exception 'bad-connection-id:no connection with the given connection id';
    end if;

    -- ON DELETE CASCADE actions will take care of cleaning up the connection
end
$$ language plpgsql;

-- to be called by a forwarder when it shuts down
-- deletes all associated channels
-- returns the number of channels that were terminated
create or replace function forwarder_stop(id text, out deleted_connections integer)
returns integer
as $$
begin
    delete from connection
       where connection.channel_id in (
           select channel_id from forwarder where forwarder.id = forwarder_stop.id
       );

    get diagnostics forwarder_stop.deleted_connections = row_count;

    delete from forwarder where forwarder.id = forwarder_stop.id;

    -- ON DELETE CASCADE actions will take care of cleaning up the connections
end
$$ language plpgsql;

-- returns a whitelist of functions that users are allowed to call
create or replace function get_allowed_functions()
returns table (name text, requires_connection_id boolean, is_procedure boolean)
as $$
    select name, requires_connection_id, is_procedure from allowed_function;
$$ language sql;

create or replace procedure allow_function(name text, requires_connection_id boolean default false, is_procedure boolean default false)
as $$
    insert into allowed_function (name, requires_connection_id, is_procedure)
        values (allow_function.name, allow_function.requires_connection_id, allow_function.is_procedure)
        on conflict(name) do update
            set
                requires_connection_id = allow_function.requires_connection_id,
                is_procedure = allow_function.is_procedure;
$$ language sql;

call allow_function('get_allowed_functions');

-- sends a notification with 'args' to the given clients
create or replace procedure notify_connections(connection_ids bigint[], event text, args json)
as $$
<<locals>>
declare
    forwarder_info record;
begin
    for forwarder_info in
        select
            concat('channel', connection.channel_id) as channel_name,
            array_agg(connection.id) as connections
            from
                connection
            where
                connection.id = any(notify_connections.connection_ids)
            group by
                connection.channel_id
    loop
        perform pg_notify(
            forwarder_info.channel_name,
            json_build_object('connections', forwarder_info.connections,
                              'event', event,
                              'args', args)::text
        );
    end loop;
end
$$ language plpgsql;

-- sends a notification with 'args' to all clients
-- TODO: get rid of this as it won't scale
create or replace procedure notify_all(event text, args json)
as $$
<<locals>>
declare
    forwarder_info record;
begin
    for forwarder_info in
        select concat('channel', forwarder.channel_id) as channel_name from forwarder
    loop
        perform pg_notify(
            forwarder_info.channel_name,
            json_build_object('connections', '*', 'event', event, 'args', args)::text
        );
    end loop;
end
$$ language plpgsql;

-- sends a notification with 'args' to the calling client
-- allows clients to test the notification system
create or replace procedure notify_me(connection_id bigint, event text, args json)
as $$
begin
    call notify_connections(ARRAY[connection_id], event, args);
end
$$ language plpgsql;
call allow_function('notify_me', requires_connection_id := true, is_procedure := true);
