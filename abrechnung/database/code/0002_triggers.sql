
-- notify the mailer service on inserts or updates in the above tables
create or replace function pending_registration_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_registration');

    return null;
end;
$$ language plpgsql;

create trigger pending_registration_trig
    after insert or update
    on pending_registration
    for each row
execute function pending_registration_updated();

create or replace function pending_password_recovery_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_password_recovery');

    return null;
end;
$$ language plpgsql;

create trigger pending_password_recovery_trig
    after insert or update
    on pending_password_recovery
    for each row
execute function pending_password_recovery_updated();

create or replace function pending_email_change_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_email_change');

    return null;
end;
$$ language plpgsql;

create trigger pending_email_change_trig
    after insert or update
    on pending_email_change
    for each row
execute function pending_email_change_updated();

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

create trigger group_invite_update_trig
    after insert or update or delete
    on group_invite
    for each row
execute function group_invite_updated();

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

create trigger group_log_update_trig
    after insert or update or delete
    on group_log
    for each row
execute function group_log_updated();

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

create trigger transaction_history_update_trig
    after insert or update or delete
    on transaction_history
    for each row
execute function transaction_history_updated();

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

create trigger creditor_share_trig
    after insert or update or delete
    on creditor_share
    for each row
execute function transaction_share_updated();

create trigger debitor_share_trig
    after insert or update or delete
    on debitor_share
    for each row
execute function transaction_share_updated();

create or replace function purchase_item_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then return null; end if;

    select
        transaction.group_id,
        transaction.id
    into locals.group_id, locals.transaction_id
    from
        transaction
        join purchase_item pi on transaction.id = pi.transaction_id
    where
            pi.id = NEW.id;

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

create trigger purchase_item_trig
    after insert or update or delete
    on purchase_item_history
    for each row
execute function purchase_item_updated();

create or replace function purchase_item_usage_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    if NEW is null then
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
            join purchase_item pi on transaction.id = pi.transaction_id
        where
                pi.id = OLD.item_id;
    else
        select
            transaction.group_id,
            transaction.id
        into locals.group_id, locals.transaction_id
        from
            transaction
            join purchase_item pi on transaction.id = pi.transaction_id
        where
                pi.id = NEW.item_id;
    end if;


    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

create trigger purchase_item_usage_trig
    after insert or update or delete
    on purchase_item_usage
    for each row
execute function purchase_item_usage_updated();

create or replace function transaction_revision_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    select
        t.group_id,
        t.id
    into locals.group_id, locals.transaction_id
    from
        transaction t
    where t.id = (case when NEW is null then OLD.transaction_id else NEW.transaction_id end);

    if NEW is null then
        call notify_user('transaction', OLD.user_id, locals.group_id::bigint,
                         json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id, 'deleted', true));
    else
        call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                          json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id, 'deleted', false));
    end if;

    return null;
end;
$$ language plpgsql;

create trigger transaction_revision_trig
    after insert or update or delete
    on transaction_revision
    for each row
execute function transaction_revision_updated();

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

create trigger account_history_update_trig
    after insert or update or delete
    on account_history
    for each row
execute function account_history_updated();

create or replace function account_revision_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    account_id integer;
begin
    select
        a.group_id,
        a.id
    into locals.group_id, locals.account_id
    from
        account a
    where a.id = (case when NEW is null then OLD.account_id else NEW.account_id end);

    -- A deletion should only be able to occur for uncommitted revisions
    if NEW is null then
        call notify_user('account', OLD.user_id, locals.group_id::bigint,
                         json_build_object('element_id', locals.group_id, 'account_id', locals.account_id, 'deleted', true));
    else
        call notify_group('account', locals.group_id, locals.group_id::bigint,
                          json_build_object('element_id', locals.group_id, 'account_id', locals.account_id, 'deleted', false));
    end if;

    return null;
end;
$$ language plpgsql;

create trigger account_revision_trig
    after insert or update or delete
    on account_revision
    for each row
execute function account_revision_updated();

create or replace function file_history_updated() returns trigger as
$$
<<locals>> declare
    group_id       grp.id%TYPE;
    transaction_id integer;
begin
    select
        transaction.group_id,
        transaction.id
    into locals.group_id, locals.transaction_id
    from
        transaction
        join file f on transaction.id = f.transaction_id
    where
            f.id = (case when NEW is null then OLD.id else NEW.id end);

    call notify_group('transaction', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id, 'transaction_id', locals.transaction_id));
    return null;
end;
$$ language plpgsql;

create trigger file_history_trig
    after insert or update or delete
    on file_history
    for each row
execute function file_history_updated();
