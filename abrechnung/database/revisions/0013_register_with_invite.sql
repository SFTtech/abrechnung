-- revision: c019dd21
-- requires: 5b333d87

alter table usr add column is_guest_user bool default false not null;

