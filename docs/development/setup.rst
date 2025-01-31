.. _abrechnung-dev-setup:

******************
Setup
******************

.. highlight:: shell

.. contents:: Table of Contents

Installation
------------

Fork and clone the repository

.. code-block:: shell

  git clone https://github.com/SFTtech/abrechnung.git
  cd abrechnung

Then install the package in local development mode as well as all required dependencies.

Setup a virtual environment and install the packages via pip

.. code-block:: shell

  virtualenv -p python3 .venv
  source .venv/bin/activate
  pip install -e . '[dev,test]'

Additionally you probably will want to activate the git pre-commit hooks (for formatting and linting) by running

.. code-block:: shell

  pre-commit install

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

It is always possible wipe and rebuild the database with

.. code-block:: shell

  abrechnung -c abrechnung.yaml db rebuild

Database migrations
-------------------

In case a new features requires changes to the database schema create a new migration file with

.. code-block:: shell

  sftkit create-migration <revision_name>

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

Finally run the tests via

.. code-block:: shell

  make test

Run the linters via

.. code-block:: shell

  make lint

Run the formatters via

.. code-block:: shell

  make format

Frontend Development
--------------------

Working on the frontend is quite easy, simply

.. code-block:: shell

  cd web
  npm install
  npx nx serve web

and you are good to go!

Documentation
-------------

To build the documentation locally simply run

.. code-block:: shell

  pip install -r docs/requires.txt
  make docs

The html docs can then be found in ``docs/_build`` or served locally with

.. code-block:: shell

  make serve-docs
