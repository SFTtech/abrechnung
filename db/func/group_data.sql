-- creates a new, uncommited change.
-- raises bad-login-credentials on error.
-- on success, returns the change id.
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
call allow_function('set_change_message');


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
    message text
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
        change.message as message
    from
        change
    where
        change.grp = get_uncommited_changes.group_id and
        (change.usr = locals.usr or not get_uncommited_changes.only_mine);
end;
$$ language plpgsql;
call allow_function('get_uncommited_changes');


-- commits a change.
-- this is only allowed if the group evaluation with this change does not
-- reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_change,
-- or group-data-inconsistent
create or replace procedure commit_change(
    token uuid,
    change_id integer
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
begin
    -- ensure that the user is authorized to write this change
    select session_auth_change.user_id, session_auth_change.group_id
    into locals.usr, locals.grp
    from session_auth_change(commit_change.token, commit_change.change_id);

    -- ensure that the user is authorized to write the group
    select from session_auth_group(commit_change.token, locals.grp);

    -- ensure that the group has no inconsistencies during evaluation with this change.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the change as commited
    update change set commited = now() where change.id = commit_change.change_id;
    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-change', concat('commited change #', commit_change.change_id));
end;
$$ language plpgsql;
call allow_function('commit_change');


-- discards a change.
--
-- can raise any of the errors from session_auth_change.
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
end;
$$ language plpgsql;
call allow_function('discard_change');
