# Setup

```{contents} Table of Contents
:depth: 2
```

## Installation

Fork and clone the repository

```shell
git clone https://github.com/SFTtech/abrechnung.git
cd abrechnung
```

Then install the package in local development mode as well as all required dependencies.

Setup a virtual environment and install the packages using uv

```shell
uv sync
```

Additionally you probably will want to activate the git pre-commit hooks (for formatting and linting) by running

```shell
uv run pre-commit install
```

## Database Setup

Have a running **PostgreSQL** database server.
Create the database (in a psql prompt):

```sql
create role someuser with login password 'somepassword';
create database somedatabasename owner someuser;
```

- exit the `psql` prompt
- Copy `config/abrechnung.yaml` to the project root folder and adjust it, e.g. enter someuser, somepassword and somedatabasename
- Populate database by applying all migrations:

```shell
uv run abrechnung -c abrechnung.yaml db migrate
```

- Launch `abrechnung -c abrechnung.yaml api`
- Launch `abrechnung -c abrechnung.yaml mailer` to get mail delivery (working mail server in config file required!)

It is always possible wipe and rebuild the database with

```shell
uv run abrechnung -c abrechnung.yaml db rebuild
```

## Database migrations

In case a new features requires changes to the database schema create a new migration file with

```shell
uv run sftkit create-migration <revision_name>
```

In case you did not install the abrechnung in development mode it might be necessary to add the project root folder
to your `PYTHONPATH`.

## Running tests and linters

To run the tests a dedicated **PostgreSQL** instance is required. The tests assume defaults for the name, user and
password as

- username: `abrechnung-test`
- database: `abrechnung-test`
- password: `asdf1234`

In case you want to use a different database / user they can be overwritten using environment variables:

- `TEST_DB_USER`
- `TEST_DB_HOST`
- `TEST_DB_PASSWORD`
- `TEST_DB_DATABASE`

Make sure the database user has owner permissions on the `public` schema of the database as dropping and recreating
is used as a means to wipe and repopulate the database between tests.

```sql
alter schema public owner to "<your user>"
```

Finally run the tests via

```shell
just test
```

Run the linters via

```shell
just lint
```

Run the formatters via

```shell
just format
```

## Frontend Development

Requirements:

- nodejs
- pnpm

Working on the frontend is quite easy, simply run

```shell
pnpm install
just dev-web
```

and you are good to go!

The frontend toolchain (dev server, build, tests, linting and formatting) is provided by [Vite+](https://viteplus.dev).
Its `vp` CLI is installed as a project dependency, so run it through pnpm from the repository root:

```shell
pnpm exec vp fmt          # format the frontend code (use --check to only verify)
pnpm exec vp lint         # lint the frontend code
pnpm -r run test          # run the tests of all frontend packages
pnpm --filter web run build  # production build of the web app
```

Tool configuration (linting, formatting) lives in the root `vite.config.ts`, the dev server, build and test
configuration in the `vite.config.ts` of each package. Note that `vp test` and `vp build` run the built-in tools,
whereas `pnpm run test` / `pnpm run build` run the scripts of the respective package.

## Documentation

To build the documentation locally simply run

```shell
just docs
```

The html docs can then be found in `docs/_build` or served locally with

```shell
just serve-docs
```
