"""
Loosely based on gist.github.com/MantasVaitkunas/7c16de233812adcb7028
This version is taken from https://github.com/theislab/scCODA/blob/master/docs/source/_ext/edit_on_github.py
"""

import warnings

__licence__ = "BSD (3 clause)"


def get_github_repo(app):
    return app.config.github_repo, "/docs/"


def html_page_context(app, pagename, templatename, context, doctree):
    if templatename != "page.html":
        return

    if not app.config.github_repo:
        warnings.warn("`github_repo `not specified")
        return

    repo, conf_py_path = get_github_repo(app)

    # For sphinx_rtd_theme.
    context["display_github"] = True
    context["github_user"] = "SFTtech"
    context["github_version"] = "master"
    context["github_repo"] = repo
    context["conf_py_path"] = conf_py_path


def setup(app):
    app.add_config_value("github_repo", "", True)
    app.connect("html-page-context", html_page_context)
