-- clears all table contents
drop schema public cascade;
create schema public;

-- create the schema for the postgresql extensions
-- must be populated by executing extensions.sql as superuser
create schema if not exists ext;
