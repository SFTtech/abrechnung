-- clears all table contents
-- extensions are placed in ext schema, thus they are not cleared.
drop schema public cascade;
create schema public;
