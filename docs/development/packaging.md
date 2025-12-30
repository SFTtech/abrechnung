# Packaging

## Debian and Ubuntu

Debian and Ubuntu packages are built by the CI on every push to master and are attached to a new release on every tag
to master.

To build the packages locally run

```shell
uv run ./tools/build_debian_packages.py
```

Docker is a requirement as the packages are built inside a matching docker container for each distribution.
