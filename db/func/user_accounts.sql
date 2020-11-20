-- functions for managing user accounts
-- these are available to the public
-- returns the timestamp until when the pending registration will be valid
-- if the email or username already exist, raises a UniqueViolationError
create or replace function register_user(email text, password text, username text, language text default 'en_int', out valid_until timestamptz)
as $$
begin
    -- clean existing, unconfirmed registration attempts with this email
    -- on delete cascade takes care of cleaning up the pending_registration table
    delete from usr where usr.pending=true and usr.email=register_user.email;

    with inserted_user as (
        insert into usr (email, password, username, language)
            values (
                register_user.email,
                ext.crypt(register_user.password, ext.gen_salt('bf', 12)),
                register_user.username,
                register_user.language
            )
            returning usr.id
    )
    insert into pending_registration (usr)
        select id
            from inserted_user
        returning pending_registration.valid_until into register_user.valid_until;

    -- notify the mailer daemon about the new pending registration
    execute pg_notify('email', '"pending_registration"');
end
$$ language plpgsql;
call allow_function('register_user');


-- designed for use by the mailer service
-- returns information for unsent pending registration mails
-- the returned mails are marked as sent
-- information for at most 5 mails is returned
-- if there's no unsent pending registration mails, an empty table is returned
create or replace function get_mails_pending_registration()
returns table (email text, username text, language text, registered_at timestamptz, valid_until timestamptz, token uuid)
as $$
    with
        registration_batch as (
            select token
                from pending_registration
                where
                    valid_until >= now() and
                    mail_sent is null
                limit 5
        ),
        usrs as (
            update
                pending_registration p
                set mail_sent=now()
                from registration_batch b
                where p.token = b.token
                returning p.usr
        )
    select
        usr.email,
        usr.username,
        usr.language,
        usr.registered_at,
        pending_registration.valid_until,
        pending_registration.token
        from
            usr,
            pending_registration
        where
            usr.id = pending_registration.usr and
            usr.id in (select usr from usrs)
$$ language sql;
-- TODO test


-- designed for use by the mailer service
-- shall be called if mail that was returned in get_mails_pending_registration()
-- could not be sent for any reason
create or replace procedure unsent_mail_pending_registration(token uuid)
as $$
    update pending_registration set mail_sent=null where pending_registration.token=unsent_mail_pending_registration.token;
    -- TODO: retry timer
$$ language sql;
-- TODO test


-- create table if not exists usr(
--     id serial primary key,
--     email text unique not null,
--     -- pgcrypto crypt
--     password text not null,
--     registered_at timestamptz not null default now(),
--     username text unique not null,
--     -- preferred language
--     language text not null default 'en_int',
--     -- has database admin permissions
--     admin boolean not null default false,
--     -- registration is not completed yet
--     pending boolean not null default true,
--     -- user is allowed to upload files
--     can_upload_files boolean not null default false,
--     -- is deleted (users with commits can't be deleted)
--     -- sessions must be cleared if a user is marked deleted
--     deleted boolean not null default false
-- );
-- 
-- create table if not exists pending_registration(
--     usr integer not null unique references usr(id) on delete cascade,
--     token uuid primary key default ext.uuid_generate_v4(),
--     -- gc should delete from usr where id=id if valid_until < now()
--     valid_until timestamptz not null default now() + interval '1 hour',
--     -- if not NULL, the registration confirmation mail has already been sent
--     mail_sent timestamptz default null
-- );



-- confirms a registration that was started with register_user()
-- the token should have been sent to the user via email
-- raises bad-registration-token if the token doesn't exist or has expired
create or replace procedure confirm_registration(token uuid)
as $$
begin
    with affected as (
        delete from pending_registration
        where
                pending_registration.token = confirm_registration.token
            and
                pending_registration.valid_until >= now()
        returning pending_registration.usr as usr
    )
    update usr
        set pending = false
        where usr.id in (select usr from affected);

    if not found then
        raise exception 'bad-registration-token:no pending registration with the given token';
    end if;
end
$$ language plpgsql;
call allow_function('confirm_registration', is_procedure := true);


-- delete timed-out pending registrations
create or replace procedure gc_pending_registration()
as $$
    with affected as (
        delete from pending_registration
        where pending_registration.valid_until < now()
        returning pending_registration.usr as usr
    )
    delete from usr
        where usr.id in (select usr from affected);
$$ language sql;


-- either name or email must be given; the other one can be null
-- valid_for_interval can be null, then the session will never expire
-- on success, returns the authentication token
-- raises bad-login-credentials on error
create or replace function login_with_password(
    session text,
    password text,
    username text default null,
    email text default null,
    valid_for interval default null,
    out token uuid
)
as $$
<<locals>>
declare
    usr integer;
    pwhash text;
begin
    if login_with_password.username is null and login_with_password.email is null then
        -- who do you want to login as?
        raise exception 'bad-login-credentials:no username or email given';
    end if;

    select usr.id, usr.password
        into locals.usr, locals.pwhash
        from usr
        where
                (login_with_password.username is null or login_with_password.username = usr.username)
            and
                (login_with_password.email is null or login_with_password.email = usr.email)
            and
                not usr.deleted
            and
                not usr.pending;

    if locals.usr is null then
        -- user does not exist
        -- should the error message say as much?
        -- in theory the same information can be gathered through register_user() so it shouldn't
        -- matter from a security perspective
        raise exception 'bad-login-credentials:no such user';
    end if;

    if locals.pwhash != ext.crypt(login_with_password.password, locals.pwhash) then
        -- password is incorrect
        raise exception 'bad-login-credentials:wrong password';
    end if;

    insert into session (usr, name, valid_until)
    values (locals.usr, login_with_password.session, now() + valid_for)
    returning session.token into token;
end
$$ language plpgsql;
call allow_function('login_with_password');


create or replace procedure gc_session()
as $$
    -- delete timed-out sessions
    delete from session
        where session.valid_until < now();
$$ language sql;


-- validates an existing login session token,
-- and returns the usr.id of the user this authenticates as
-- designed for internal use by all functions that accept a session authtoken
-- all methods that call this can raise bad-authtoken
create or replace function session_auth(token uuid, fatal boolean default true, out usr integer)
as $$
begin
    update session
        -- maybe updating last_seen() is bad for performance?
        set last_seen = now()
        where
                session.token = session_auth.token
            and
                (session.valid_until is null or session.valid_until >= now())
    returning session.usr into session_auth.usr;

    if session_auth.fatal and session_auth.usr is null then
        raise exception 'bad-authtoken:invalid session authtoken';
    end if;
end
$$ language plpgsql;


-- returns a list of all of the user's active sessions
create or replace function list_sessions(authtoken uuid)
returns table (id integer, name text, valid_until timestamptz, last_seen timestamptz, this boolean)
as $$
    with auth as (
        select usr from session_auth(list_sessions.authtoken)
    )
    select
        session.id,
        session.name,
        session.valid_until,
        session.last_seen,
        session.token = list_sessions.authtoken as this
    from session
        where
                session.usr in (select usr from auth)
            and
                (session.valid_until is null or session.valid_until >= now());
$$ language sql;
call allow_function('list_sessions');


-- renames one of the user's sessions
-- raises bad-session-id if no such session exists
create or replace procedure rename_session(authtoken uuid, session integer, new_name text)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(rename_session.authtoken) into locals.usr;

    update session
        set name = rename_session.new_name
        where
                session.id = rename_session.session
            and
                session.usr = locals.usr;

    if not found then
        raise exception 'bad-session-id:no such session id';
    end if;
end;
$$ language plpgsql;
call allow_function('rename_session', is_procedure := true);


-- logs out of the current session
create or replace procedure logout(authtoken uuid)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(logout.authtoken) into locals.usr;

    delete from session
        where session.token = logout.authtoken;
end;
$$ language plpgsql;
call allow_function('logout', is_procedure := true);


-- logs out another session (of the same user)
-- raises bad-session-id if no such session exists
create or replace procedure logout_session(authtoken uuid, session integer)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(logout_session.authtoken) into locals.usr;

    delete from session
        where
                session.usr = locals.usr
            and
                (logout_session.session is null or session.id = logout_session.session);

    if not found then
        raise exception 'bad-session-id:no such session id';
    end if;
end;
$$ language plpgsql;
call allow_function('logout_session', is_procedure := true);


-- creates a 'pending password recovery' entry, which will cause a
-- password recovery email to be sent to the affected user
-- if the user does not exist, this is a no-op
create or replace procedure request_password_recovery(email text)
as $$
<<locals>>
declare
    usr integer;
begin
    select usr.id
        into locals.usr
        from usr
        where
            usr.email = request_password_recovery.email and
            usr.pending = false and
            usr.deleted = false;

    if locals.usr is null then
        -- user does not exist
        raise exception 'bad-email:no registered user with this email address';
    end if;

    -- forget about the existing recovery attempt (if any)
    delete from pending_password_recovery where pending_password_recovery.usr = locals.usr;
    -- add a new recovery attempt
    insert into pending_password_recovery (usr) values (usr);
    -- notify the mailer daemon about the new pending registration
    execute pg_notify('email', '"pending_password_recovery"');
end;
$$ language plpgsql;
call allow_function('request_password_recovery', is_procedure := true);


-- delete timed-out pending password recovery requests
create or replace procedure gc_pending_password_recovery()
as $$
    delete from pending_password_recovery
        where pending_password_recovery.valid_until < now()
$$ language sql;


-- recover a password with a password-recovery token that was received by mail,
-- after request_password_recovery() has been called.
create or replace procedure confirm_password_recovery(token uuid, password text)
as $$
<<locals>>
declare
    usr integer;
begin
    select pending_password_recovery.usr
        into locals.usr
        from pending_password_recovery
        where
            pending_password_recovery.token = confirm_password_recovery.token and
            pending_password_recovery.valid_until >= now();

    if locals.usr is null then
        raise exception 'bad-recovery-token:no such recovery token or timed out';
    end if;

    update usr
    set password = ext.crypt(confirm_password_recovery.password, ext.gen_salt('bf', 12))
    where usr.id = locals.usr;

    delete from pending_password_recovery where pending_password_recovery.token = confirm_password_recovery.token;
end;
$$ language plpgsql;
call allow_function('confirm_password_recovery', is_procedure := true);


-- change a user's password
-- as an extra security measure, the current password must be given
create or replace procedure change_password(authtoken uuid, password text, new_password text)
as $$
<<locals>>
declare
    usr integer;
    pwhash text;
begin
    select session_auth(change_password.authtoken) into locals.usr;
    select usr.password into locals.pwhash from usr where usr.id = locals.usr;

    if locals.pwhash != ext.crypt(change_password.password, locals.pwhash) then
        -- password is incorrect
        raise exception 'bad-login-credentials:wrong password';
    end if;

    update usr
        set password=ext.crypt(change_password.new_password, ext.gen_salt('bf', 12))
        where usr.id = locals.usr;
end;
$$ language plpgsql;
call allow_function('change_password', is_procedure := true);


-- requests a change of the user's email address.
-- a notification mail will be sent to the old email address,
-- and a confirmation mail will be sent to the new email address.
-- the password must be supplied as an extra security measure.
-- if a change-email request already exists, it is overwritten.
create or replace procedure request_email_change(authtoken uuid, password text, new_email text)
as $$
<<locals>>
declare
    usr integer;
    pwhash text;
    old_email text;
begin
    select session_auth(request_email_change.authtoken) into locals.usr;
    select usr.password, usr.email
        into locals.pwhash, locals.old_email
        from usr
        where usr.id = locals.usr;

    if locals.pwhash != ext.crypt(request_email_change.password, locals.pwhash) then
        -- password is incorrect
        raise exception 'bad-login-credentials:wrong password';
    end if;

    if locals.old_email = request_email_change.new_email then
        raise exception 'no-change:email unchanged';
    end if;

    -- forget about the existing email change request (if any)
    delete from pending_email_change where pending_email_change.usr = locals.usr;
    -- add a new change request
    insert into pending_email_change (usr, new_email)
        values (locals.usr, request_email_change.new_email);
    -- notify the mailer daemon about the new change request
    execute pg_notify('email', '"pending_email_change"');
end;
$$ language plpgsql;
call allow_function('request_email_change', is_procedure := true);


-- delete timed-out pending email change requests
create or replace procedure gc_pending_email_change()
as $$
    delete from pending_email_change
        where pending_email_change.valid_until < now()
$$ language sql;


-- confirms a request_email_change() request with the
-- authtoken that was subsequently received by email.
create or replace procedure confirm_email_change(token uuid)
as $$
<<locals>>
declare
    usr integer;
    new_email text;
begin
    select pending_email_change.usr, pending_email_change.new_email
        into locals.usr, locals.new_email
        from pending_email_change
        where
            pending_email_change.token = confirm_email_change.token and
            pending_email_change.valid_until >= now();

    if not found then
        raise exception 'bad-email-change-token:no pending email change with the given token';
    end if;

    update usr set email=locals.new_email where usr.id=locals.usr;
    delete from pending_email_change where pending_email_change.token = confirm_email_change.token;
end;
$$ language plpgsql;
call allow_function('confirm_email_change', is_procedure := true);


-- returns the user information for the given user
create or replace function get_user_info(
    authtoken uuid,
    out email text,
    out registered_at timestamptz,
    out username text,
    out language text,
    out admin boolean,
    out can_upload_files boolean
)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(authtoken) into locals.usr;
    select
        usr.email, usr.registered_at, usr.username, usr.language, usr.admin, usr.can_upload_files
        into
            get_user_info.email, get_user_info.registered_at, get_user_info.username, get_user_info.language, get_user_info.admin, get_user_info.can_upload_files
        from usr
        where usr.id = locals.usr;
end;
$$ language plpgsql;
call allow_function('get_user_info');


-- validates an admin's existing login session token,
-- and returns the usr.id of the admin user this authenticates as.
-- all methods that call this can raise bad-authtoken or no-admin
create or replace function admin_auth(token uuid, fatal boolean default true, out usr integer)
as $$
begin
    select session_auth(admin_auth.token, fatal := admin_auth.fatal) into admin_auth.usr;

    select usr.id into admin_auth.usr
    from usr
    where usr.id=admin_auth.usr and usr.admin=true;

    if admin_auth.fatal and admin_auth.usr is null then
        raise exception 'no-admin:user does not have admin permissions';
    end if;
end;
$$ language plpgsql;


-- (dis)allows an user to upload files
-- the authtoken must be an admin user's authtoken
create or replace procedure user_allow_upload_files(authtoken uuid, email text, allow boolean)
as $$
begin
    perform admin_auth(user_allow_upload_files.authtoken);

    update usr set can_upload_files=user_allow_upload_files.allow where usr.email=user_allow_upload_files.email;
    if not found then
        raise exception 'bad-email:no user has that email';
    end if;
end;
$$ language plpgsql;
call allow_function('user_allow_upload_files', is_procedure := true);


-- (un)marks an user as an admin
-- the authtoken must be an admin user's authtoken
create or replace procedure user_set_admin(authtoken uuid, email text, admin boolean)
as $$
begin
    perform admin_auth(user_set_admin.authtoken);

    update usr set admin=user_set_admin.admin where usr.email=user_set_admin.email;
    if not found then
        raise exception 'bad-email:no user has that email';
    end if;
end;
$$ language plpgsql;
call allow_function('user_set_admin', is_procedure := true);


-- sets the user's preferred language
create or replace procedure user_set_language(authtoken uuid, language text)
as $$
<<locals>>
declare
    usr integer;
begin
    select session_auth(user_set_language.authtoken) into locals.usr;
    update usr set language=user_set_language.language where usr.id = locals.usr;
end;
$$ language plpgsql;
call allow_function('user_set_language', is_procedure := true);


-- can be called by a user to delete their account
-- requires the password as an extra security measure
-- marks the user as deleted and deletes all of their sessions and pending requests
create or replace procedure delete_account(authtoken uuid, password text)
as $$
<<locals>>
declare
    usr integer;
    pwhash text;
begin
    select session_auth(delete_account.authtoken) into locals.usr;
    select usr.password
        into locals.pwhash
        from usr
        where usr.id = locals.usr;

    if locals.pwhash != ext.crypt(delete_account.password, locals.pwhash) then
        -- password is incorrect
        raise exception 'bad-login-credentials:wrong password';
    end if;

    update usr set deleted=true, password='disabled' where usr.id=locals.usr;
    delete from session where session.usr=locals.usr;
    delete from pending_password_recovery where pending_password_recovery.usr=locals.usr;
    delete from pending_email_change where pending_email_change.usr=locals.usr;
end;
$$ language plpgsql;
call allow_function('delete_account', is_procedure := true);
