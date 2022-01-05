.. _abrechnung-installation:

******************
Installation
******************

.. highlight:: shell

.. _abrechnung-installation-debian:

Debian Buster, Bullseye, Bookworm and Sid
-----------------------------------------
This is the recommended installation method as it also installs the prebuilt abrechnung web app.

Simply go to the `github release page <https://github.com/SFTtech/abrechnung/releases>`_ and download
the latest debian package matching your debian version for the latest release.

Install them via ::

  sudo apt install ./abrechnung_<version>.deb


All dependencies, systemd services, config files in ``/etc/abrechnung``, nginx config in ``/etc/nginx/sites-available/abrechnung``
as well as static web assets in ``/usr/share/abrechnung_web`` are installed.

The only remaining work to be done is to setup the database and customize the configuration (see :ref:`abrechnung-config`).

Ubuntu Focal, Hirsute and Impish
--------------------------------

Follow the installation instructions for :ref:`Debian <abrechnung-installation-debian>`, just make sure to choose the correct
``.deb`` package file.

Pip
---------------

TODO

From Release Tarball
--------------------

TODO

From Source
---------------

TODO
