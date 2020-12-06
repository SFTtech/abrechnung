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

    if session_auth_grp.need_write_permission and session_auth_grp.can_write is not true then
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
create or replace function group_invite(
    authtoken uuid,
    grp int,
    description text,
    valid_until timestamptz = null,
    single_use bool default true,
    out invite_token uuid
)
as $$
<<locals>>
declare
    usr integer;
begin
    -- the user needs to be a group member,
    -- but any user can create new invites even if they have only read permissions
    select session_auth_grp.usr into locals.usr
    from session_auth_grp(group_invite.authtoken, group_invite.grp);

    insert into group_invite(grp, description, created_by, valid_until, single_use)
    values (
        group_invite.grp,
        group_invite.description,
        locals.usr,
        group_invite.valid_until,
        group_invite.single_use
    )
    returning token into group_invite.invite_token;
end;
$$ language plpgsql;
call allow_function('group_invite');


create or replace function group_preview(
    invitetoken uuid,
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
        group_invite.token = group_preview.invitetoken and
        group_invite.grp = grp.id;
end;
$$ language plpgsql;
call allow_function('group_preview');
