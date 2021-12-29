.. _abrechnung-config:

******************
Configuration
******************

.. highlight:: shell

After any change to the configuration make sure to apply it by restarting the respective service.

Database
---------------
The first step after installing the **abrechnung** is to setup the database. Due to the use of database specific features
we only support **PostgreSQL** with versions >= 13. Other versions might work but are untested.

First create a database with an associated user ::

  $ sudo -u postgres psql
  > create user abrechnung with password '<some secure password>';
  > create database abrechnung owner abrechnung;

Enter the information into the config file in ``/etc/abrechnung/abrechnung.yaml`` under the section database as

.. code-block:: yaml

  database:
    host: "localhost"
    user: "abrechnung"
    dbname: "abrechnung"
    password: "<password>"

Apply all database migrations with ::

  abrechnung db migrate

General Options
---------------
Some options need to be configured globally such as the base https endpoints (api and web ui) to be used in mail
delivery and proper api resource URLs. If ``abrechnung.example.lol`` is your domain adjust the ``service`` section as follows.
In case your change your API endpoint to another domain, port or subpath make sure to also change it here.

.. code-block:: yaml

  service:
    url: "https://abrechnung.example.lol"
    api_url: "https://abrechnung.example.lol/api"
    name: "Abrechnung"

The ``name`` is used to populate the email subjects as ``[<name>] <subject>``.

API Config
---------------
Typically the config for the http API does not need to be changed much apart from one critical setting!
In the ``api`` section make sure to insert a newly generated secret key, e.g. with ::

  pwgen -S 64 1

The config will then look like

.. code-block:: yaml

  api:
    secret_key: "<your secret key>"
    host: "localhost"
    port: 8080
    id: default

In most cases there is no need to adjust either the ``host``, ``port`` or ``id`` options. For an overview of all
possible options see :ref:`abrechnung-config-all-options`.

E-Mail Delivery
---------------

To setup E-Mail delivery adjust the ``email`` config section to fit your use case. An example might look like

.. code-block:: yaml

  email:
    address: "abrechnung@example.lol"
    host: "localhost"
    port: 587
    mode: "smtp-starttls"
    auth:
      username: "abrechnung"
      password: "Mb2.r5oHf-0t"

Currently supported ``mode`` options are

* ``local``, uses lmtp on localhost
* ``smtp-ssl``, uses smtp with forced ssl
* ``smtp-starttls``, uses smtp with starttls
* if mode is not given plain smtp is used

The ``auth`` section is optional, if omitted the mail delivery daemon will try to connect to the mail server
without authentication.

.. _abrechnung-config-all-options:

All Configuration Options
-------------------------
TODO