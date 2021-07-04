-- functions for event subscription management
-- called by the client so it receives change-events

-- subscribe user of given token to notifications
create or replace procedure subscribe(connection_id bigint,
                                      token uuid,
                                      subscription_type subscription_type,
                                      element_id bigint)
as $$
<<locals>>
declare
    user_id integer;
begin
    if subscribe.element_id is null then
        raise exception 'bad-subscription: invalid element_id value';
    end if;

    select session_auth(subscribe.token) into locals.user_id;

    -- type-specific permission/value checks
    if subscribe.subscription_type = 'test' then
        -- only allow element_id == user_id
        if subscribe.element_id != locals.user_id then
            raise exception 'bad-subscription: test requires correct element_id';
        end if;

    elseif subscribe.subscription_type = 'session' then
        -- session_auth is enough for session subscriptions
        -- but the element we watch has to be the user id
        if subscribe.element_id != locals.user_id then
            raise exception 'bad-subscription:session: element_id not token user';
        end if;

    else
        raise exception 'bad-subscription:unknown subscription type';
    end if;

    insert into subscription
                (connection_id, user_id, subscription_type, element_id)
    values (subscribe.connection_id,
            locals.user_id,
            subscribe.subscription_type,
            subscribe.element_id)
           on conflict on constraint subscription_conn_type_elem
           do update
           set user_id = locals.user_id;
end
$$ language plpgsql;
call allow_function('subscribe', requires_connection_id := true, is_procedure := true);


-- deliver a notification of given type
-- to all subscribers
create or replace procedure notify_subscribers(
    subscription_type subscription.subscription_type%TYPE,
    user_id subscription.user_id%TYPE,
    element_id subscription.element_id%TYPE,
    args json
)
as $$
<<locals>>
declare
    connections bigint[];
begin
    -- this query directly uses the subscription_deliver_idx
    select array_agg(connection_id)
      into locals.connections
      from subscription
     where subscription.subscription_type = notify_subscribers.subscription_type and
           notify_subscribers.user_id = subscription.user_id and
           notify_subscribers.user_id = subscription.element_id;

    call notify_connections(locals.connections,
                            notify_subscribers.subscription_type::text,
                            notify_subscribers.args);
end;
$$ language plpgsql;



-- unsubscribe user of given token to notifications
-- if the user could create the subscription on the connection_id,
-- he can also remove it.
create or replace procedure unsubscribe(connection_id bigint,
                                        subscription_type subscription_type,
                                        element_id bigint)
as $$
<<locals>>
declare
    user_id integer;
begin
    delete from subscription
     where subscription.connection_id = unsubscribe.connection_id and
           subscription.subscription_type = unsubscribe.subscription_type and
           subscription.element_id = unsubscribe.element_id;
end
$$ language plpgsql;
call allow_function('unsubscribe', requires_connection_id := true, is_procedure := true);
