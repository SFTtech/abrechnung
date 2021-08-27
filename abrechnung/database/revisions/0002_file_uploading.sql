-------------------------------------------------------------------------------
-- media file hosting
create table if not exists hoster(
    id serial primary key,
    -- full URL to file with 'filename' hosted at this hoster: base_url + '/' + filename
    base_url text not null
);

-- tokens that allow users to upload files
-- these are independent of session tokens for security reasons
-- (file servers should not get access to session tokens)
create table if not exists file_upload_token(
    usr integer primary key references usr(id) on delete cascade,
    token uuid unique not null default gen_random_uuid()
);

create table if not exists file(
    -- gen_random_uuid() plus suitable file extension
    filename text primary key,
    -- hash of file content
    sha256 text not null,
    file_mime text not null
);

-- a single file can be uploaded at multiple hosters
create table if not exists file_hoster(
    -- if a file is deleted from the file table, it still stays here to
    -- allow garbage collection by the hoster
    filename text primary key references file(filename) on delete no action,
    hoster integer not null references hoster(id) on delete cascade
);

-- this allows users to see (and use) the files they have uploaded,
-- and the admin to track e.g. copyright violations to users
-- multiple users could upload the same file, so this needs its own table
create table if not exists file_uploader(
    -- files can be deleted if deleted = true
    filename text references file(filename) on delete no action,
    -- usrs who have uploaded files cannot be deleted
    usr integer references usr(id) on delete restrict,
    uploaded timestamptz not null,
    -- whether the uploader has deleted the file
    deleted bool not null default false
);
