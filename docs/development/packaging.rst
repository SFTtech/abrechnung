.. _abrechnung-dev-packaging:

******************
Packaging
******************

.. highlight:: shell

The main ``abrechnung`` python package is automatically built and uploaded to
`Test Pypi <https://test.pypi.org/project/abrechnung/>`_ and
`Pypi <https://pypi.org/project/abrechnung/>`_ on every tag on master by the CI pipeline.

Debian and Ubuntu
-----------------

Debian and Ubuntu packages are built by the CI on every push to master and are attached to a new release on every tag
to master.

To build the packages locally run::

  ./tools/build_debian_packages.py

Docker is a requirement as the packages are built inside a matching docker container for each distribution.
