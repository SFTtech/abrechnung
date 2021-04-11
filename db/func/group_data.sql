-- creates a new, uncommited change.
-- raises bad-login-credentials on error.
-- on success, returns the change id and enters the change into
-- the users' watched_uncommited_change list.
create or replace function create_change(
    token uuid,
    group_id integer,
    message text default '',
    out change_id integer
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(create_change.token, create_change.group_id, need_write_permission := true);

    insert into change (grp, usr, message)
    values (create_change.group_id, locals.usr, create_change.message)
    returning change.id into create_change.change_id;

    insert into watched_uncommited_change (change_id, user_id)
    values (create_change.change_id, locals.usr);

    insert into group_log (grp, usr, type)
    values (create_change.group_id, locals.usr, 'create-change');
end;
$$ language plpgsql;
call allow_function('create_change');


-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the change.
--
-- also checks that the user is allowed to modify the given change.
--
-- designed for internal use by all functions that accept a session authtoken,
-- and want to modify a change.
--
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-change-ownership
-- - change-already-commited
create or replace function session_auth_change(
    token uuid,
    change_id bigint,
    out user_id integer,
    out group_id integer
)
as $$
<<locals>>
declare
    commited timestamptz;
begin
    select session_auth(session_auth_change.token) into session_auth_change.user_id;

    select
        change.commited,
        change.grp
    into
        locals.commited,
        session_auth_change.group_id
    from
        change
    where
        change.id = change_id and
        change.usr = session_auth_change;

    if not found then
        raise exception 'no-change-ownership:user does not own this change';
    end if;

    if commited is not null then
        raise exception 'change-already-commited:change has already been commited';
    end if;
end;
$$ language plpgsql;


-- watches or unwatches a change.
-- raises bad-login-credentials or change-already-commited on error.
-- no-op if the change is already watched or unwatched.
create or replace procedure watch_uncommited_change(
    token uuid,
    change_id integer,
    watch boolean
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
    commited timestamptz;
begin
    -- check which group this change is part of
    select
        change.grp, change.commited
    into
        locals.grp, locals.commited
    from
        change
    where
        change.id = watch_uncommited_change.change_id;

    -- if the change does not exist, locals.grp will be NULL
    -- session_auth_group will then complain about non-existing group,
    -- which is a good error (leaking no information).
    select session_auth_group.user_id into locals.usr
    from session_auth_group(watch_uncommited_change.token, locals.grp);

    -- we could have done this check before doing the group_auth,
    -- but then we'd leak group info to unprivileged users or even non-users.
    if commited is not null then
        raise exception 'change-already-commited:change has already been commited';
    end if;

    if watch_uncommited_change.watch then
        insert into watched_uncommited_change (change_id, user_id)
        values (watch_uncommited_change.change_id, locals.usr)
        on conflict do nothing;
    else
        delete from watched_uncommited_change
        where
            change_id = watch_uncommited_change.change_id and
            user_id = locals.usr;
    end if;
end;
$$ language plpgsql;
call allow_function('watch_uncommited_change');


-- sets the message of a change
create or replace procedure set_change_message(
    token uuid,
    change_id integer,
    message text
)
as $$
begin
    select from session_auth_change(set_change_message.token, set_change_message.change_id);

    update change set change.message = set_change_message.message
    where change.id = set_change_message.change_id;
end;
$$ language plpgsql;


-- returns all uncomited changes of a group
-- if only_mine is set to True, only the user's changes are returned
create or replace function get_uncommited_changes(
    token uuid,
    group_id integer,
    only_mine boolean
)
returns table (
    change_id bigint,
    user_id integer,
    started timestamptz,
    message text,
    watched boolean
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_group.user_id into locals.usr
    from session_auth_group(get_uncommited_changes.token, get_uncommited_changes.group_id);

    return query
    select
        change.id as change_id,
        change.usr as user_id,
        change.started as started,
        change.message as message,
        if(watched_uncommited_change.change_id is null, false, true) as watched
    from
        change
    left join watched_uncommited_change on
        watched_uncommited_change.change_id = change.id and
        watched_uncommited_change.user_id = locals.usr
    where
        change.grp = get_uncommited_changes.group_id and
        (change.usr = locals.usr or not get_uncommited_changes.only_mine);
end;
$$ language plpgsql;
call allow_function('get_uncommited_changes');


-- commits a change.
-- this is only allowed if the user is only watching this change in its group,
-- and the group evaluation with this change does not reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_change,
-- wrong-changes-watched, or group-data-inconsistent
create or replace procedure commit_change(
    token uuid,
    change_id integer
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
    watched_change_count bigint;
    watched_change_id bigint;
begin
    -- ensure that the user is authorized to write this change
    select session_auth_change.user_id, session_auth_change.group_id
    into locals.usr, locals.grp
    from session_auth_change(commit_change.token, commit_change.change_id);

    -- ensure that the user is authorized to write the group
    select from session_auth_group(commit_change.token, locals.grp);

    -- ensure that the user is currently watching exactly this uncommited change
    -- in the group, and no other changes
    select
        count(*),
        watched_uncommited_change.change_id
    into
        watched_change_count,
        watched_change_id
    from
        watched_uncommited_change,
        change
    where
        watched_uncommited_change.user_id = locals.usr and
        watched_uncommited_change.change_id = change.id and
        change.grp = locals.grp;

    if watched_change_count != 1 or watched_change_id != commit_change.change_id then
        raise exception 'wrong-changes-watched:to commit a change, exactly this change must be watched by the user in the group';
    end if;

    -- ensure that the group has no inconsistencies during evaluation with this change.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the change as commited
    update change set commited = now() where change.id = commit_change.change_id;
    -- delete the change from everybody's watched uncommited change list
    delete from watched_uncommited_change where watched_uncommited_change.id = commit_change.change_id;
    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-change', concat('commited change #', commit_change.change_id));
end;
$$ language plpgsql;
call allow_function('commit_change');


-- discards a change.
-- this is only allowed if the user is only watching this change in its group,
-- and the group evaluation with this change does not reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_change,
-- wrong-changes-watched, or group-data-inconsistent
create or replace procedure discard_change(
    token uuid,
    change_id integer
)
as $$
begin
    -- ensure that the user is authorized to write this change
    select from session_auth_change(discard_change.token, discard_change.change_id);

    -- get rid of the change
    delete from change where change.id = discard_change.change_id;
    delete from watch_uncommited_change where watch_uncommited_change.change_id = discard_change.change_id;
end;
$$ language plpgsql;
call allow_function('discard_change');
