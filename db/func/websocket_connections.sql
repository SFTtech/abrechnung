-- functions for managing websocket connections
-- these should be used by the websocket forwarder

-- creates a row in the forwarder table (if not exists)
-- listens to channel
-- returns channel name
create or replace function forwarder_boot(forwarder text, out channel_name text)
as $$
<<locals>>
declare
    channel_number forwarder.notification_channel_number%type;
begin
    select notification_channel_number
        into locals.channel_number
            from forwarder
            where id = forwarder_boot.forwarder;

    if locals.channel_number is null then
        -- this forwarder is currently unknown
        insert into forwarder (id)
            values (forwarder_boot.forwarder)
            returning notification_channel_number into locals.channel_number;
    else
        -- this forwarder is already known
        -- get rid of potential old entries
        -- (these are left over if a forwarder crashes)
        delete from connection
            where connection.forwarder = forwarder_boot.forwarder;
    end if;

    channel_name := concat('channel', locals.channel_number);
end
$$ language plpgsql;

-- to be called by a forwarder whenever a new client connects to it via websocket
-- creates a row in the connection table
-- returns connection_id
create or replace function client_connected(forwarder text, out connection_id bigint)
as $$
begin
    insert into connection (forwarder)
        values (client_connected.forwarder)
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
-- deletes all associated connections
-- returns the number of connections that were terminated
create or replace function forwarder_stop(forwarder text, out deleted_connections integer)
returns integer
as $$
begin
    delete from connection
        where connection.forwarder = forwarder_stop.forwarder;

    get diagnostics forwarder_stop.deleted_connections = row_count;

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
            concat('channel', forwarder.notification_channel_number) as channel_name,
            array_agg(connection.id) as connections
            from
                forwarder,
                connection
            where
                forwarder.id = connection.forwarder and
                connection.id = any(notify_connections.connection_ids)
            group by
                forwarder.id
    loop
        execute pg_notify(
            forwarder_info.channel_name,
            json_build_object('connections', forwarder_info.connections, 'event', event, 'args', args)::text
        );
    end loop;
end
$$ language plpgsql;

-- sends a notification with 'args' to all clients
create or replace procedure notify_all(event text, args json)
as $$
<<locals>>
declare
    forwarder_info record;
begin
    for forwarder_info in
        select concat('channel', forwarder.notification_channel_number) as channel_name from forwarder
    loop
        execute pg_notify(
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
