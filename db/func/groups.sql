-- creates a new group with the given parameters
-- the creating user will be the only member and have owner privileges
create or replace function group_create(
    authtoken uuid,
    name text,
    description text,
    terms text,
    currency text,
    out id int
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(group_create.authtoken) into locals.usr;

    insert into grp (name, description, terms, currency)
        values (group_create.name, group_create.description, group_create.terms, group_create.currency)
        returning grp.id into group_create.id;

    insert into group_membership
        (usr, grp, description, is_owner, can_write)
        values (locals.usr, group_create.id, 'creator', true, true);

    insert into group_log (grp, usr, type)
    values (group_create.id, locals.usr, 'group-create');
end;
$$ language plpgsql;
call allow_function('group_create');


-- lists groups that the user is a member of
create or replace function group_list(authtoken uuid)
returns table (
    id integer,
    name text,
    description text,
    member_count bigint,
    created timestamptz,
    joined timestamptz,
    latest_commit timestamptz,
    is_owner bool,
    can_write bool
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(group_list.authtoken) into locals.usr;

    return query
    with
        my_groups as (
            select
                grp.id as grp,
                grp.name as name,
                grp.description as description,
                grp.created as created,
                group_membership.joined as joined,
                group_membership.is_owner as is_owner,
                group_membership.can_write as can_write
            from group_membership, grp
            where group_membership.grp = grp.id
            and group_membership.usr = locals.usr
        ),
        group_member_counts as (
            select
                my_groups.grp as grp,
                count(other_group_members.usr) as member_count
            from my_groups, group_membership as other_group_members
            where my_groups.grp = other_group_members.grp
            group by my_groups.grp
        ),
        latest_commit as (
            select
                my_groups.grp as grp,
                max(commit.timestamp) as latest_commit
            from
                my_groups
            left outer join commit
                on (my_groups.grp = commit.grp)
            group by my_groups.grp
        )
    select
        my_groups.grp as id,
        my_groups.name as name,
        my_groups.description as description,
        group_member_counts.member_count as member_count,
        my_groups.created as created,
        my_groups.joined as joined,
        latest_commit.latest_commit as latest_commit,
        my_groups.is_owner as is_owner,
        my_groups.can_write as can_write
    from
        my_groups natural join
        group_member_counts natural join
        latest_commit
    order by
        latest_commit.latest_commit desc,
        my_groups.joined desc;
end;
$$ language plpgsql;
call allow_function('group_list');


-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
--
-- also checks that the user is part of the group and has the
-- needed permissions.
-- 
-- designed for internal use by all functions that accept a session authtoken.
-- methods that call this can raise:
--
-- - bad-authtoken
-- - no-group-membership
-- - no-group-write-permission
-- - no-group-owner-permission
create or replace function session_auth_grp(
    token uuid,
    grp integer,
    need_write_permission boolean default false,
    need_owner_permission boolean default false,
    out usr integer,
    out can_write boolean,
    out is_owner boolean
)
as $$
begin
    select session_auth(session_auth_grp.token) into session_auth_grp.usr;

    select group_membership.can_write, group_membership.is_owner
    into session_auth_grp.can_write, session_auth_grp.is_owner
    from group_membership
    where
        group_membership.usr = session_auth_grp.usr and
        group_membership.grp = session_auth_grp.grp;

    if not found then
        raise exception 'no-group-membership:user is not a member of the group';
    end if;

    if
        session_auth_grp.need_write_permission and
        session_auth_grp.can_write is not true and
        session_auth_grp.is_owner is not true  -- owners are also allowed to write!
    then
        raise exception 'no-group-write-permission:user cannot write in group';
    end if;

    if session_auth_grp.need_owner_permission and session_auth_grp.is_owner is not true then
        raise exception 'no-group-owner-permission:user is not owner of group';
    end if;
end;
$$ language plpgsql;


-- create an invite token for a group
-- this token can be given to other users and allows them to join the group
-- valid_until can be null for infinite validity
-- if single_use = true, only one user can use this invite to join the group
create or replace function group_invite_create(
    authtoken uuid,
    group_id int,
    description text,
    valid_until timestamptz = null,
    single_use bool default true,
    out token uuid
)
as $$
<<locals>>
declare
    usr integer;
begin
    -- the user needs to be a group member,
    -- but any user can create new invites even if they have only read permissions
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_invite_create.authtoken, group_invite_create.group_id);

    insert into group_invite(grp, description, created_by, valid_until, single_use)
    values (
        group_invite_create.group_id,
        group_invite_create.description,
        locals.usr,
        group_invite_create.valid_until,
        group_invite_create.single_use
    )
    returning group_invite.token into group_invite_create.token;

    insert into group_log (grp, usr, type)
    values (group_invite_create.group_id, locals.usr, 'invite-create');
end;
$$ language plpgsql;
call allow_function('group_invite_create');


-- delete timed-out invite links
create or replace procedure gc_group_invite()
as $$
    delete from group_invite
    where group_invite.valid_until < now();
$$ language sql;


-- previews group metadata with an invite token
-- doesn't require user authentication
-- designed to be displayed to a user that wants to join a grup
create or replace function group_preview(
    invite_token uuid,
    out group_id integer,
    out group_name text,
    out group_description text,
    out group_created timestamptz,
    out invite_description text,
    out invite_valid_until timestamptz,
    out invite_single_use bool
)
as $$
begin
    select
        grp.id,
        grp.name,
        grp.description,
        grp.created,
        group_invite.description,
        group_invite.valid_until,
        group_invite.single_use
    into
        group_preview.group_id,
        group_preview.group_name,
        group_preview.group_description,
        group_preview.group_created,
        group_preview.invite_description,
        group_preview.invite_valid_until,
        group_preview.invite_single_use
    from
        group_invite, grp
    where
        group_invite.token = group_preview.invite_token and
        group_invite.grp = grp.id;
end;
$$ language plpgsql;
call allow_function('group_preview');


-- joins the user to the group with the given invite token
-- returns the id of the group that the user just joined
create or replace function group_join(
    authtoken uuid,
    invite_token uuid,
    out group_id integer
)
as $$
<<locals>>
declare
    usr integer;
    inviter integer;
begin
    select session_auth(group_join.authtoken) into locals.usr;

    select group_invite.grp, group_invite.created_by
    into group_join.group_id, locals.inviter
    from group_invite
    where
        group_invite.token = group_join.invite_token and
        group_invite.valid_until >= now();

    insert into group_membership (usr, grp, is_owner, can_write, invited_by)
    values (locals.usr, group_join.group_id, false, false, locals.inviter);

    -- delete the invite if it was single-use
    delete from group_invite
    where
        group_invite.token = group_join.invite_token and
        group_invite.single_use;

    insert into group_log (grp, usr, type, affected)
    values (group_join.group_id, locals.usr, 'invite-join', locals.inviter);
end;
$$ language plpgsql;
call allow_function('group_join');


-- lists all members of the group
create or replace function group_member_list(
    authtoken uuid,
    group_id integer
)
returns table (
    usr_id integer,
    username text,
    is_owner bool,
    can_write bool,
    joined timestamptz,
    invited_by integer,
    description text
)
as $$
<<locals>>
declare
    usr integer;
    inviter integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_member_list.authtoken, group_member_list.group_id);

    return query
    select
        usr.id as usr_id,
        usr.username as username,
        group_membership.is_owner as is_owner,
        group_membership.can_write as can_write,
        group_membership.joined as joined,
        group_membership.invited_by as invited_by,
        group_membership.description as description
    from
        group_membership, usr
    where
        group_membership.usr = usr.id and
        group_membership.grp = group_member_list.group_id;
    order by
        group_membership.joined;
end;
$$ language plpgsql;
call allow_function('group_member_list');


-- grants or revokes privileges of another group member
-- if 'null' is passed for a privilege, it remains unchanged
create or replace procedure group_member_privileges_set(
    authtoken uuid,
    group_id integer,
    usr_id integer,
    can_write boolean default null,
    is_owner boolean default null
)
as $$
<<locals>>
declare
    usr integer;
    old_can_write boolean;
    old_is_owner boolean;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(
        group_member_privileges_set.authtoken,
        group_member_privileges_set.group_id,
        need_write_permission := (can_write is not null),
        need_owner_permission := (is_owner is not null)
    );

    if group_member_privileges_set.usr = locals.usr then
        raise exception 'cannot-modify-own-privileges:group members cannot modify their own privileges';
    end if;

    select
        group_membership.can_write,
        group_membership.is_owner
    into
        locals.old_can_write,
        locals.old_is_owner
    from
        group_membership
    where
        group_membership.grp = group_member_privileges_set.group_id and
        group_membership.usr = group_member_privileges_set.usr_id;

    if locals.old_can_write is null then
        raise exception 'no-such-group-member:there is no group member with this id';
    end if;

    if not
        (
            (group_member_privileges_set.can_write != locals.old_can_write) or
            (group_member_privileges_set.is_owner != locals.old_is_owner)
        )
    then
        -- no changes are requested, skip table update
        return;
    end if;

    update group_membership
    set
        can_write = group_member_privileges_set.can_write,
        is_owner = group_member_privileges_set.is_owner
    where
        group_membership.grp = group_member_privileges_set.group_id and
        group_membership.usr = group_member_privileges_set.usr_id;

    if group_member_privileges_set.can_write != locals.old_can_write then
        insert into group_log (grp, usr, type, affected)
        values (
            group_member_privileges_set.grp,
            locals.usr,
            case
                when group_member_privileges_set.can_write then 'grant-write'
                else 'revoke-write'
            end,
            group_member_privileges_set.usr_id
        );
    end if;

    if group_member_privileges_set.is_owner != locals.old_is_owner then
        insert into group_log (grp, usr, type, affected)
        values (
            group_member_privileges_set.grp,
            locals.usr,
            case
                when group_member_privileges_set.can_write then 'grant-owner'
                else 'revoke-owner'
            end,
            group_member_privileges_set.usr_id
        );
    end if;
end;
$$ language plpgsql;
call allow_function('group_member_privileges_set', is_procedure := true);


-- lists existing invite tokens of the group
-- if only_mine is set, only the tokens of this user are returned
-- the token values are returned only for the user's own tokens
create or replace function group_invite_list(
    authtoken uuid,
    group_id integer,
    only_mine boolean default false
)
returns table (
    invite_id bigint,
    invite_token uuid,
    description text,
    created_by integer,
    valid_until timestamptz,
    single_use boolean
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_invite_list.authtoken, group_invite_list.group_id);

    return query
    select
        group_invite.id as invite_id,
        case
            when group_invite.created_by = locals.usr then group_invite.token
            else null
        end as token,
        group_invite.description as description,
        group_invite.created_by as created_by,
        group_invite.valid_until as valid_until,
        group_invite.single_use as single_use
    from
        group_invite
    where
        group_invite.grp = group_invite_list.group_id;
end;
$$ language plpgsql;
call allow_function('group_invite_list');


-- deletes an existing group invite token
create or replace procedure group_invite_delete(
    authtoken uuid,
    group_id integer,
    invite_id bigint
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_invite_delete.authtoken, group_invite_delete.group_id);

    delete from group_invite
    where
        group_invite.grp = group_invite_delete.group_id and
        group_invite.id = group_invite_delete.invite_id;

    if not found then
        raise exception 'no-such-invite:no invite token with this id for this group';
    end if;

    insert into group_log (grp, usr, type)
    values (group_invite_delete.group_id, locals.usr, 'invite-delete');
end;
$$ language plpgsql;
call allow_function('group_invite_delete', is_procedure := true);


-- posts a chat message to the group log
create or replace procedure group_log_post(
    authtoken uuid,
    group_id integer,
    message text
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_log_post.authtoken, group_log_post.group_id);

    insert into group_log (grp, usr, type, message)
    values (group_log_post.group_id, locals.usr, 'text-message', group_log_post.message);
end;
$$ language plpgsql;
call allow_function('group_log_post', is_procedure := true);


-- retrieves the group log
create or replace function group_log_get(
    authtoken uuid,
    group_id integer,
    from_id bigint default 0
)
returns table (
    logentry_id bigint,
    usr_id integer,
    logged timestamptz,
    type text,
    message text,
    affected_usr_id integer
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_log_get.authtoken, group_log_get.group_id);

    return query
    select
        group_log.id as logentry_id,
        group_log.usr as usr_id,
        group_log.logged as logged,
        group_log.type as type,
        group_log.message as message,
        group_log.affected as affected_usr_id
    from
        group_log
    where
        group_log.grp = group_log_get.group_id and
        group_log.id >= group_log_get.from_id
    order by
        group_log.id;
end;
$$ language plpgsql;
call allow_function('group_log_get');


-- retrieves the group metadata
create or replace function group_metadata_get(
    authtoken uuid,
    group_id integer,
    out name text,
    out description text,
    out terms text,
    out currency text
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_metadata_get.authtoken, group_metadata_get.group_id);

    select
        grp.name,
        grp.description,
        grp.terms,
        grp.currency
    into
        group_metadata_get.name,
        group_metadata_get.description,
        group_metadata_get.terms,
        group_metadata_get.currency
    from
        grp
    where
        grp.id = group_metadata_get.group_id;
end;
$$ language plpgsql;
call allow_function('group_metadata_get');


-- modifies the group metadata
-- all parameters that are passed as null remain unchanged
create or replace procedure group_metadata_set(
    authtoken uuid,
    group_id integer,
    name text default null,
    description text default null,
    terms text default null,
    currency text default null
)
as $$
<<locals>>
declare
    usr integer;
    old_name text;
    old_description text;
    old_terms text;
    old_currency text;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(
        group_metadata_set.authtoken,
        group_metadata_set.group_id,
        need_owner_permission := true
    );

    select
        grp.name,
        grp.description,
        grp.terms,
        grp.currency
    into
        locals.old_name,
        locals.old_description,
        locals.old_terms,
        locals.old_currency
    from
        grp
    where
        grp.id = group_metadata_set.group_id;

    if not
        (
            (group_metadata_set.name != locals.old_name) or
            (group_metadata_set.description != locals.old_description) or
            (group_metadata_set.terms != locals.old_terms) or
            (group_metadata_set.currency != locals.old_currency)
        )
    then
        -- no changes are requested, skip table update
        return;
    end if;

    update grp
    set
        name = group_metadata_set.name,
        description = group_metadata_set.description,
        terms = group_metadata_set.terms,
        currency = group_metadata_set.currency
    where
        grp.id = group_metadata_set.group_id;

    if group_metadata_set.name != locals.old_name then
        insert into group_log (grp, usr, type, message)
        values (
            group_metadata_set.group_id,
            locals.usr,
            'group-change-name',
            concat('old name: ', locals.old_name)
        );
    end if;
    if group_metadata_set.description != locals.old_description then
        insert into group_log (grp, usr, type, message)
        values (
            group_metadata_set.group_id,
            locals.usr,
            'group-change-description',
            concat('old description: ', locals.old_description)
        );
    end if;
    if group_metadata_set.terms != locals.old_terms then
        values (
            group_metadata_set.group_id,
            locals.usr,
            'group-change-terms',
            concat('old terms: ', locals.old_terms)
        );
    end if;
    if group_metadata_set.currency != locals.old_currency then
        insert into group_log (grp, usr, type, message)
        values (
            group_metadata_set.group_id,
            locals.usr,
            'group-change-currency',
            concat('old currency: ', locals.old_currency)
        );
    end if;
end;
$$ language plpgsql;
call allow_function('group_metadata_set', is_procedure := true);


-- leaves a group
create or replace procedure group_leave(
    authtoken uuid,
    group_id integer
)
as $$
<<locals>>
declare
    usr integer;
    member_count integer;
    remaining_owner_count integer;
begin
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_invite_delete.authtoken, group_invite_delete.group_id);

    select count(group_membership.usr) into locals.member_count
    from group_membership
    where group_membership.grp = group_leave.group_id;

    if locals.member_count = 1 then
        -- we're the last user in the group; delete it!
        delete from grp where grp.id = group_leave.group_id;
        return;
    end if;

    select count(group_membership.usr) into locals.remaining_owner_count
    from group_membership
    where
        group_membership.grp = group_leave.group_id and
        group_membership.usr != locals.usr and
        group_membership.is_owner;

    if locals.remaining_owner_count = 0 then
        raise exception 'last-owner-cannot-leave:cannot leave the group because you are the last owner';
    end if;

    delete from group_membership
    where
        group_membership.grp = group_leave.group_id and
        group_membership.usr = locals.usr;
end;
$$ language plpgsql;
call allow_function('group_leave', is_procedure := true);
