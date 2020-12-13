-- garbage collection entry function
-- internal calls various other table-specific gc functions

-- should be called periodically
create or replace procedure gc() as $$
    call gc_pending_registration();
    call gc_session();
    call gc_pending_password_recovery();
    call gc_pending_email_change();
    call gc_group_invite();
$$ language sql;
