.. _abrechnung-installation:

******************
Installation
******************

.. highlight:: shell

.. _abrechnung-installation-debian:

Debian Bullseye and Bookworm
-----------------------------------------
This is the recommended installation method as it also installs the prebuilt abrechnung web app.

Simply go to the `github release page <https://github.com/SFTtech/abrechnung/releases>`_ and download
the latest debian package matching your debian version for the latest release.

Install them via ::

  sudo apt install ./abrechnung_<version>.deb


All dependencies, systemd services, config files in ``/etc/abrechnung``, nginx config in ``/etc/nginx/sites-available/abrechnung``
as well as static web assets in ``/usr/share/abrechnung_web`` are installed.

The only remaining work to be done is to setup the database and customize the configuration (see :ref:`abrechnung-config`).

Ubuntu Noble
--------------------------------

Follow the installation instructions for :ref:`Debian <abrechnung-installation-debian>`, just make sure to choose the correct
``.deb`` package file.

.. _abrechnung-installation-docker:

Docker Compose
----------------
We provide prebuilt docker containers for the api and the web frontend under `https://quay.io/abrechnung`.

To use our docker compose clone the github repository ::

  git clone https://github.com/SFTtech/abrechnung.git

Then copy the ``.env.example`` file to ``.env`` and configure it to your liking ::

  cd abrechnung
  cp .env.example .env
  vim .env

For production setups we recommend running an external postgres database but if you feel adventurous you
can adapt the docker-compose file to also run a postgres container (which we definitely do not recommend).
In case of using an external postgres database make sure to
follow :ref:`the configuration instructions <abrechnung-database-config>` on how to create a database.
Afterwards make sure to include the database configuration parameters in the ``.env`` configuration file.

Then a simple simple ::

  docker-compose -f docker-compose.prod.yaml up

Should suffice to get you up and running.
