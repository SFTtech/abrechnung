.. _abrechnung-dev-packaging:

******************
Packaging
******************

.. highlight:: shell

The main ``abrechnung`` python package is automatically built and uploaded to
`Test Pypi <https://test.pypi.org/project/abrechnung/>`_ on every commit to master and to main
`Pypi <https://pypi.org/project/abrechnung/>`_ on every tag on master by the CI pipeline.

Debian
------

In a debian environment checkout the respective debian release branch, e.g. ``debian/bullseye`` and merge the
desired release tag e.g. ``v0.3.0`` ::

  git checkout debian/bullseye
  git merge v0.3.0
  gbp buildpackage --git-debian-branch=debian/bullseye

Add the resulting files to a github release

