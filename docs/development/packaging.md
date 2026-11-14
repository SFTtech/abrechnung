# Packaging

## Debian and Ubuntu

Debian and Ubuntu packages are built by the CI on every push to master and are attached to a new release on every tag
to master.

Packages are built with [debmagic](https://github.com/SFTtech/debmagic) inside a docker container per distribution
(the target distributions are listed in `debian/changelog`). The frontend is not built as part of the package build,
the prebuilt web app is expected in `dist/apps/web`.

To build the packages locally run

```shell
pnpm install && pnpm --filter web run build
uv run debmagic build binary --distro trixie
```

Docker is a requirement.
