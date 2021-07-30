-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- as well as the group id of the revision.
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
create or replace function session_auth_revision(
    authtoken uuid,
    revision_id bigint,
    out user_id integer,
    out group_id integer
)
as $$
<<locals>>
declare
    commited timestamptz;
begin
    select session_auth(session_auth_revision.authtoken) into session_auth_revision.user_id;

    select
        revision.commited,
        coalesce(transaction.grp, account.grp)
    into
        locals.commited,
        session_auth_revision.group_id
    from
        revision
    left join
        account on account.id = revision.account
    left join
        transaction on transaction.id = revision.transaction
    where
        revision.id = session_auth_revision.revision_id and
        revision.usr = session_auth_revision.user_id;

    if not found then
        raise exception 'no-change-ownership:user does not own this change';
    end if;

    if commited is not null then
        raise exception 'change-already-commited:change has already been commited';
    end if;
end;
$$ language plpgsql;

-- sets the message of a change
create or replace procedure set_revision_message(
    authtoken uuid,
    revision_id integer,
    message text
)
as $$
begin
    select from session_auth_revision(set_revision_message.authtoken, set_revision_message.revision_id);

    update revision set revision.message = set_revision_message.message
    where revision.id = set_revision_message.revision_id;
end;
$$ language plpgsql;
call allow_function('set_revision_message', is_procedure := true);


-- returns all uncomited changes of a group
-- if only_mine is set to True, only the user's changes are returned
create or replace function get_uncommited_revisions(
    authtoken uuid,
    group_id integer,
    only_mine boolean
)
returns table (
    revision_id bigint,
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
    from session_auth_group(get_uncommited_revisions.authtoken, get_uncommited_revisions.group_id);

    return query
    select
        revision.id as revision_id,
        revision.usr as user_id,
        revision.started as started,
        revision.message as message
    from
        revision
    left join account on revision.id = account.id
    left join transaction on revision.id = transaction.id
    where
        (transaction.grp = get_uncommited_revisions.group_id or account.grp = get_uncommited_revisions.group_id) and
        (revision.usr = locals.usr or not get_uncommited_revisions.only_mine);
end;
$$ language plpgsql;
call allow_function('get_uncommited_revisions');

create or replace procedure _commit_revision(
    revision_id integer
)
as $$
begin
    -- ensure that the group has no inconsistencies during evaluation with this revision.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the revision as commited
    update revision set commited = now() where revision.id = _commit_revision.revision_id;
end;
$$ language plpgsql;

-- commits a revision.
-- this is only allowed if the group evaluation with this change does not
-- reveal any inconsistencies.
--
-- can raise any of the errors from session_auth_group or session_auth_revision,
-- or group-data-inconsistent
create or replace procedure commit_revision(
    authtoken uuid,
    revision_id integer
)
as $$
<<locals>>
declare
    usr integer;
    grp integer;
begin
    -- ensure that the user is authorized to write this revision
    select session_auth_revision.user_id, session_auth_revision.group_id
    into locals.usr, locals.grp
    from session_auth_revision(commit_revision.authtoken, commit_revision.revision_id);

    -- ensure that the user is authorized to write the group
    perform session_auth_group(commit_revision.authtoken, locals.grp, true);

    -- ensure that the group has no inconsistencies during evaluation with this revision.
    -- TODO attempt to evaluate in the context of this user and check the consistency flag

    -- set the revision as commited
    call _commit_revision(commit_revision.revision_id);

    -- add a log entry for the commit
    insert into group_log (grp, usr, type, message)
    values (locals.grp, locals.usr, 'commit-revision', concat('commited revision #', commit_revision.revision_id));
end;
$$ language plpgsql;
call allow_function('commit_revision', is_procedure := true);


-- discards a change.
--
-- can raise any of the errors from session_auth_change.
create or replace procedure discard_revision(
    authtoken uuid,
    revision_id integer
)
as $$
begin
    -- ensure that the user is authorized to write this revision
    perform session_auth_revision(discard_revision.authtoken, discard_revision.revision_id);

    -- TODO: do not allow discarding of a revision if it is associated with a transaction history or account history without any predecessors.
    -- get rid of the revision
    delete from revision where revision.id = discard_revision.revision_id;
end;
$$ language plpgsql;
call allow_function('discard_revision', is_procedure := true);

-- notifications for changes in debitor shares
create or replace function revision_updated()
    returns trigger
as $$
<<locals>>
    declare
    group_id grp.id%TYPE;
    user_id usr.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL
    if NEW is null then
        select coalesce(transaction.grp, account.grp)
        into locals.group_id
        from transaction, account
        where account.id = OLD.account or transaction.id = OLD.transaction;

        locals.user_id = OLD.usr;
    else
        select coalesce(transaction.grp, account.grp)
        into locals.group_id
        from transaction, account
        where account.id = NEW.account or transaction.id = NEW.transaction;

        locals.user_id = NEW.usr;
    end if;

    if NEW.commited is null then -- we only want to notify the user to which the uncommited revision belongs to
        call notify_subscribers(
                'revision',
                locals.user_id,
                locals.group_id::bigint,
                json_build_object('element_id', locals.group_id)
            );
    else
        call notify_group(
                'revision',
                locals.group_id,
                locals.group_id::bigint,
                json_build_object('element_id', locals.group_id)
            );
    end if;
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists revision_update_trig on revision;
create trigger revision_update_trig after insert or update or delete
    on revision
    for each row
execute function revision_updated();

create or replace function revision_list(
    authtoken uuid,
    group_id integer
)
returns table (
    id bigint,
    user_id integer,
    account_id integer,
    transaction_id integer,
    started timestamptz,
    commited timestamptz
)
as $$
<<locals>>
    declare
    user_id integer;
begin
    select session_auth_group.user_id into locals.user_id
    from session_auth_group(revision_list.authtoken, revision_list.group_id);

    return query
        select
            revision.id as revision_id,
            revision.usr as user_id,
            revision.account as account_id,
            revision.transaction as transaction_id,
            revision.started as started,
            revision.commited as commited
        from revision
        where revision.commited is not null or revision.usr = locals.user_id;
end;
$$ language plpgsql;
call allow_function('revision_list');
