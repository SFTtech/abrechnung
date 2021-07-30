-- latest account history as seen from a given user
create or replace view latest_account as
    select distinct on (account.id, gm.usr)
        account.id                               as id,
        account.grp                              as group_id,
        last_value(history.revision) over wnd    as revision_id,
        last_value(history.valid) over wnd       as valid,
        last_value(history.name) over wnd        as name,
        last_value(history.description) over wnd as description,
        last_value(history.priority) over wnd    as priority,
        gm.usr                                   as user_id
    from
        account_history history
        join account on account.id = history.id
        join revision on revision.id = history.revision
        join group_membership gm on account.grp = gm.grp
    where
        (revision.commited is null and revision.usr = gm.usr)
        or revision.commited is not null window wnd as ( partition by account.id order by revision.commited desc nulls first );

-- retrieves the accounts in a group essentially returning the last account_history entry for each account
create or replace function account_list(
    authtoken uuid,
    group_id integer
)
    returns table (
        id          integer,
        revision_id bigint,
        valid       bool,
        name        text,
        description text,
        priority    integer
    )
as
$$
<<locals>> declare
    user_id integer;
begin
    select
        session_auth_group.user_id
    into locals.user_id
    from
        session_auth_group(account_list.authtoken, account_list.group_id);

    return query select
                     la.id          as id,
                     la.revision_id as revision_id,
                     la.valid       as valid,
                     la.name        as name,
                     la.description as description,
                     la.priority    as priority
                 from
                     latest_account la
                 where
                     la.group_id = account_list.group_id
                     and la.user_id = locals.user_id;
end;
$$ language plpgsql;
call allow_function('account_list');

-- creates a new account in a group
create or replace function account_create(
    authtoken uuid,
    group_id integer,
    name text,
    description text,
    priority integer default 0,
    out account_id integer,
    out revision_id bigint
) as
$$
<<locals>> declare
    usr integer;
begin
    select
        session_auth_group.user_id
    into locals.usr
    from
        session_auth_group(account_create.authtoken, account_create.group_id, true);

    insert into account (
        grp
    )
    values (
        account_create.group_id
    )
    returning account.id into account_create.account_id;

    insert into revision (
        account, usr, commited
    )
    values (
        account_create.account_id, locals.usr, now()
    )
    returning revision.id into account_create.revision_id;

    insert into account_history(
        id, revision, name, description, priority
    )
    values (
        account_create.account_id, account_create.revision_id, account_create.name, account_create.description,
        account_create.priority
    );
end;
$$ language plpgsql;
call allow_function('account_create');

-- updates an account account in a group
create or replace function account_edit(
    authtoken uuid,
    group_id integer,
    account_id integer,
    name text,
    description text,
    priority integer default 0,
    out revision_id bigint
) as
$$
<<locals>> declare
    usr integer;
begin
    select
        session_auth_group.user_id
    into locals.usr
    from
        session_auth_group(account_edit.authtoken, account_edit.group_id, true);

    perform from account where account.id = account_edit.account_id;

    if not found then raise 'account-not-found: an account with this id does not exist'; end if;

    insert into revision (
        account, usr, commited
    )
    values (
        account_edit.account_id, locals.usr, now()
    )
    returning revision.id into account_edit.revision_id;

    insert into account_history(
        id, revision, name, description, priority
    )
    values (
        account_edit.account_id, account_edit.revision_id, account_edit.name, account_edit.description,
        account_edit.priority
    );
end;
$$ language plpgsql;
call allow_function('account_edit');

-- notifications for changes in accounts
create or replace function account_updated() returns trigger as
$$
<<locals>> declare
    group_id grp.id%TYPE;
begin
    -- A deletion should not be possible therefore NEW should never be NULL

    select account.grp into locals.group_id from account where account.id = NEW.id;

    call notify_group('account', locals.group_id, locals.group_id::bigint,
                      json_build_object('element_id', locals.group_id));
    return NULL;
end;
$$ language plpgsql;

drop trigger if exists account_update_trig on account_history;
create trigger account_update_trig
    after insert or update or delete
    on account_history
    for each row
execute function account_updated();
