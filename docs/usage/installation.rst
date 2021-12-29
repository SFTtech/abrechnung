.. _abrechnung-installation:

******************
Installation
******************

.. highlight:: shell

Debian Bullseye
---------------
This is the recommended installation method as it also installs the prebuilt abrechnung web app.

Simply go to the `github release page <https://github.com/SFTtech/abrechung/releases>`_ and download
the latest debian packages (*abrechnung* and *python3-abrechnung*) for the latest release.

Install them via ::

  dpkg -i python3-abrechnung*.deb
  dpkg -i abrechnung*.deb


All dependencies, systemd services, config files in ``/etc/abrechnung``, nginx config in ``/etc/nginx/sites-available/abrechnung``
as well as static web assets in ``/usr/share/abrechnung_web`` are installed.

The only remaining work to be done is to setup the database and customize the configuration (see :ref:`abrechnung-config`).

Pip
---------------

TODO

From Release Tarball
--------------------

TODO

From Source
---------------

TODO
