.. _abrechnung-config:

******************
Configuration
******************

.. highlight:: shell

After any change to the configuration make sure to apply it by restarting the respective service.

.. _abrechnung-database-config:

Database
---------------
The first step after installing the **abrechnung** is to setup the database. Due to the use of database specific features
we only support **PostgreSQL** with versions >= 13. Other versions might work but are untested.

First create a database with an associated user

.. code-block:: shell

  sudo -u postgres psql
  create user abrechnung with password '<some secure password>';
  create database abrechnung owner abrechnung;

Enter the information into the config file in ``/etc/abrechnung/abrechnung.yaml`` under the section database as

.. code-block:: yaml

  database:
    host: "localhost"
    user: "abrechnung"
    dbname: "abrechnung"
    password: "<password>"

Apply all database migrations with

.. code-block:: shell

  abrechnung db migrate

General Options
---------------

.. code-block:: yaml

  service:
    name: "Abrechnung"

The ``name`` is used to populate the email subjects as ``[<name>] <subject>``.

API Config
---------------
Typically the config for the http API does not need to be changed much apart from two important settings!
In the ``api`` section make sure to insert a newly generated secret key, e.g. with

.. code-block:: shell

  pwgen -S 64 1

Additionally you need to configure your base https endpoints to be used in mail
delivery and proper api resource URLs. If ``abrechnung.example.lol`` is your domain adjust the ``api`` section as follows.

.. code-block:: yaml

  api:
    id: "default"
    secret_key: "<your secret key>"
    host: "localhost"
    port: 8080
    # base url is given by the domain the abrechnung instance is hosted at
    base_url: "https://abrechnung.example.lol"

In most cases there is no need to adjust the ``host``, ``port`` or ``id`` options.

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
      password: "<verysecret>"

Currently supported ``mode`` options are

* ``local``, uses lmtp on localhost
* ``smtp-ssl``, uses smtp with forced ssl
* ``smtp-starttls``, uses smtp with starttls
* if mode is not given plain smtp is used

The ``auth`` section is optional, if omitted the mail delivery daemon will try to connect to the mail server
without authentication.

User Registration
-----------------

This section allows to configure how users can register at the abrechnung instance.
By default open registration is disabled.

When enabling registration without any additional settings any user will be able to create an account and use it after
a successful email confirmation.

E-mail confirmation can be turned of by setting the respective config variable to ``false``.

.. code-block:: yaml

  registration:
    enabled: true
    require_email_confirmation: true

Additionally open registration can be restricted adding domains to the ``valid_email_domains`` config variable.
This will restrict account creation to users who possess an email from one of the configured domains.
To still allow outside users to take part the ``allow_guest_users`` flag can be set which enables users to create a
"guest" account when in possession of a valid group invite link.
Guest users will not be able to create new groups themselves but can take part in groups they are invited to normally.

.. code-block:: yaml

  registration:
    enabled: true
    require_email_confirmation: true
    valid_email_domains: ["some-domain.com"]
    allow_guest_users: true

Prometheus Metrics
------------------

Abrechnung also provides prometheus metrics which are disabled by default.
This includes some general metrics about the abrechnung instance such as

- http request durations and groupings of error codes
- general python environment metrics such as process utilization and garbage collection performance

Additionally it currently includes the following set of abrechnung specific metrics

- number of groups created on the instance
- number of transactions created on the instance
- total amount of money by currency which was cleared via the instance, i.e. the total sum of transaction values per currency over all groups.
  This is disabled by default as it may expose private data on very small abrechnung instances.

To enable metrics under the api endpoint ``/api/metrics`` simply add the following to the config file

.. code-block:: yaml

  metrics:
    enabled: true
    expose_money_amounts: false  # disabled by default

Configuration via Environment Variables
---------------------------------------

All of the configuration options set in the config yaml file can also be set via environment variables.
The respective environment variable name for a config variable is in the pattern ``ABRECHNUNG_<config section>__<variable name in capslock>``.

E.g. to set the email auth username from the config yaml as below we'd use the environment variable ``ABRECHNUNG_EMAIL__AUTH__USERNAME``.

.. code-block:: yaml

  email:
    auth:
      username: "..."


Frontend Configuration
-------------------------

The frontend also has some configuration options which can be configured in the ``service`` section of the yaml configuration.
This enables server administrators to show information banners / messages on top via the ``messages`` config key to e.g. announce maintenance.

Possible config options are

.. code-block:: yaml

  service:
    # ...
    messages:
      - type: "info"  # "error" | "warning" | "success"
        body: "This is an informational message which will be displayed at the top of the application"
        title: "My optional title"
    imprint_url: "https://my-imprint-for-my-abrechnung-instance.mydomain.com"
