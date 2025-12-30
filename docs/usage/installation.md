# Installation

(debian-installation)=

## Debian Trixie

This is the recommended installation method as it also installs the prebuilt abrechnung web app.

Simply go to the [github release page](https://github.com/SFTtech/abrechnung/releases) and download
the latest debian package matching your debian version for the latest release.

Install them via

```shell
sudo apt install ./abrechnung_<version>.deb
```

All dependencies, systemd services, config files in `/etc/abrechnung`, nginx config in `/etc/nginx/sites-available/abrechnung`
as well as static web assets in `/usr/share/abrechnung_web` are installed.

The only remaining work to be done is to setup the database and customize the configuration (see [Configuration](configuration.md)).

## Ubuntu Noble

Follow the installation instructions for [Debian](debian-installation), just make sure to choose the correct
`.deb` package file.

## Docker Compose

We provide prebuilt docker containers for the api and the web frontend under `https://quay.io/abrechnung`.

To use our docker compose clone the github repository

```shell
git clone https://github.com/SFTtech/abrechnung.git
```

Then copy the `.env.example` file to `.env` and configure it to your liking ::

```shell
cd abrechnung
cp .env.example .env
vim .env
```

For production setups we recommend running an external postgres database but if you feel adventurous you
can adapt the docker-compose file to also run a postgres container (which we definitely do not recommend).
In case of using an external postgres database make sure to
follow [the configuration instructions](./configuration.md) on how to create a database.
Afterwards make sure to include the database configuration parameters in the `.env` configuration file.

Then a simple simple

```shell
docker-compose -f docker-compose.prod.yaml up
```

Should suffice to get you up and running.
