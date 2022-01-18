.. _abrechnung-dev-setup:

******************
Setup
******************

.. highlight:: shell

.. contents:: Table of Contents

Installation
------------

Fork and clone the repository ::

  git clone https://github.com/SFTtech/abrechnung.git
  cd abrechnung

Then install the package in local development mode as well as all required dependencies. Make sure to have
`flit <https://github.com/pypa/flit>`_ installed first. Installing the dependencies can be two ways:

Setup a virtual environment and install the packages via pip (straightforward way) ::

  virtualenv -p python3 venv
  source venv/bin/activate
  pip install flit
  flit install -s --deps develop

Or install the dependencies through your package manager (useful for distribution packaging)

* arch linux (slight chance some dependencies may be missing here)

.. code-block:: shell

  sudo pacman -S python-flit python-yaml python-aiohttp python-aiohttp-cors python-asyncpg python-sphinx python-schema python-email-validator python-bcrypt python-pyjwt python-aiosmtpd python-pytest python-pytest-cov python-black python-mypy python-pylint python-apispec python-marshmallow python-webargs

Afterwards install the package without dependencies ::

  flit install -s --deps none

Database Setup
--------------

Have a running **PostgreSQL** database server.
Create the database (in a psql prompt):

.. code-block:: sql

  create role someuser with login password 'somepassword';
  create database somedatabasename owner someuser;

* exit the ``psql`` prompt
* Copy ``config/abrechnung.yaml`` to the project root folder and adjust it, e.g. enter someuser, somepassword and somedatabasename
* Populate database by applying all migrations:

.. code-block:: shell

  abrechnung -c abrechnung.yaml db migrate

* Launch ``abrechnung -c abrechnung.yaml api``
* Launch ``abrechnung -c abrechnung.yaml mailer`` to get mail delivery (working mail server in config file required!)

It is always possible wipe and rebuild the database with ::

  abrechnung -c abrechnung.yaml db rebuild

Database migrations
-------------------

In case a new features requires changes to the database schema create a new migration file with

.. code-block:: shell

  ./tools/create_revision.py <revision_name>

In case you did not install the abrechnung in development mode it might be necessary to add the project root folder
to your ``PYTHONPATH``.

Running tests and linters
-------------------------

To run the tests a dedicated **PostgreSQL** instance is required. The tests assume defaults for the name, user and
password as

* username: ``abrechnung-test``
* database: ``abrechnung-test``
* password: ``asdf1234``

In case you want to use a different database / user they can be overwritten using environment variables:

* ``TEST_DB_USER``
* ``TEST_DB_HOST``
* ``TEST_DB_PASSWORD``
* ``TEST_DB_DATABASE``

Make sure the database user has owner permissions on the ``public`` schema of the database as dropping and recreating
is used as a means to wipe and repopulate the database between tests.

.. code-block:: sql

  alter schema public owner to "<your user>"

Finally run the tests via ::

  make test

Run the linters via ::

  make lint

Frontend Development
--------------------

Working on the frontend is quite easy, simply ::

  cd web
  yarn install
  yarn start

and you are good to go!

Documentation
-------------

To build the documentation locally simply run ::

  make docs

The html docs can then be found in ``docs/_build``.
