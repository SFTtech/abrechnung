# Abrechnung e2e tests

[Playwright](https://playwright.dev) tests running the production web build against a real backend and database.

## Running locally

```sh
# 1. a postgres matching apps/e2e/config.e2e.yaml (it is reset on every run!)
docker run --rm -d -p 5432:5432 -e POSTGRES_USER=abrechnung -e POSTGRES_PASSWORD=password -e POSTGRES_DB=abrechnung postgres

# 2. one time setup
pnpm install
pnpm --filter e2e run install-browsers

# 3. build the web app and run the tests
just e2e
```

Playwright starts the api (after resetting the database and creating the test users, see `scripts/prepare_db.py`)
and the web preview server on its own.
