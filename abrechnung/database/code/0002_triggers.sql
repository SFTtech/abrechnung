
-- notify the mailer service on inserts or updates in the above tables
create or replace function pending_registration_updated() returns trigger as
$$
begin
    perform pg_notify('mailer', 'pending_registration');

    return null;
end;
$$ language plpgsql
set search_path = "$user", public;

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
$$ language plpgsql
set search_path = "$user", public;

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
$$ language plpgsql
set search_path = "$user", public;

create trigger pending_email_change_trig
    after insert or update
    on pending_email_change
    for each row
execute function pending_email_change_updated();
