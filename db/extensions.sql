-- initializes the extensions in the schema 'ext',
-- so they will not be affected by dropping the schema 'public'.
-- these SQL statements must be run by a superuser.
do $$ begin
    create schema if not exists ext;
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create extension "pgcrypto" with schema ext;
exception
    when duplicate_object then null;
end $$;
