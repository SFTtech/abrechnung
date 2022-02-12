# Configuration file for the Sphinx documentation builder.
#
# This file only contains a selection of the most common options. For a full
# list see the documentation:
# https://www.sphinx-doc.org/en/master/usage/configuration.html

# -- Path setup --------------------------------------------------------------

import datetime

# If extensions (or modules to document with autodoc) are in another directory,
# add these directories to sys.path here. If the directory is relative to the
# documentation root, use os.path.abspath to make it absolute, like shown here.
#
import json
import sys
from pathlib import Path

import marshmallow.fields
import yaml

HERE = Path(__file__).parent
sys.path[:0] = [str(HERE.parent), str(HERE / "_ext")]
BUILD_DIR = HERE / "_build"

import abrechnung
from abrechnung.config import Config, CONFIG_SCHEMA, TimedeltaField
from abrechnung.http import HTTPService, validation_middleware
from abrechnung.http.openapi import setup_aiohttp_apispec

# -- Project information -----------------------------------------------------

project = "abrechnung"
author = "Michael Loipführer, Jonas Jelten, Michael Enßlin"
copyright = (  # pylint: disable=redefined-builtin
    f"{datetime.datetime.now():%Y}, {author}"
)

version = abrechnung.__version__.replace(".dirty", "")
release = version

# -- General configuration ---------------------------------------------------

# Add any Sphinx extension module names here, as strings. They can be
# extensions coming with Sphinx (named 'sphinx.ext.*') or your custom
# ones.
extensions = [
    "sphinx.ext.autodoc",
    "sphinx.ext.intersphinx",
    "sphinx.ext.doctest",
    "sphinx.ext.coverage",
    "sphinx.ext.mathjax",
    "sphinx.ext.napoleon",
    "sphinx.ext.autosummary",
    "sphinx_autodoc_typehints",
    "sphinxcontrib.openapi",
    *[p.stem for p in (HERE / "_ext").glob("*.py")],
]

# Generate the API documentation when building
autosummary_generate = True
autodoc_member_order = "bysource"
napoleon_google_docstring = False
napoleon_numpy_docstring = True
napoleon_include_init_with_doc = False
napoleon_use_rtype = True  # having a separate entry generally helps readability
napoleon_use_param = True
napoleon_custom_sections = [("Params", "Parameters")]
todo_include_todos = False
source_suffix = [".rst", ".md"]

intersphinx_mapping = dict(
    python=("https://docs.python.org/3", None),
)

# Add any paths that contain templates here, relative to this directory.
templates_path = ["_templates"]

# List of patterns, relative to source directory, that match files and
# directories to ignore when looking for source files.
# This pattern also affects html_static_path and html_extra_path.
exclude_patterns = ["_build", "Thumbs.db", ".DS_Store"]

# -- Options for HTML output -------------------------------------------------

# The theme to use for HTML and HTML Help pages.  See the documentation for
# a list of builtin themes.
html_theme = "sphinx_rtd_theme"
html_theme_options = dict(navigation_depth=1, titles_only=True)
github_repo = "abrechnung"
html_context = dict(
    display_github=True,  # Integrate GitHub
    github_user="SFTtech",  # Username
    github_repo="abrechnung",  # Repo name
    github_version="master",  # Version
    conf_py_path="/docs/",  # Path in the checkout to the docs root
)

# Add any paths that contain custom static files (such as style sheets) here,
# relative to this directory. They are copied after the builtin static files,
# so a file named "default.css" will overwrite the builtin "default.css".
# html_static_path = ["_static"]
html_show_sphinx = False


def generate_openapi_json():
    """
    generate swagger OpenAPI
    """
    config = Config({"api": {"secret_key": "foobar"}})
    service = HTTPService(config)
    app = service._create_api_app(  # pylint: disable=protected-access
        db_pool=None, middlewares=[validation_middleware]
    )  # FIXME: hack to not require db connection

    openapi = setup_aiohttp_apispec(
        app=app,
        title="Abrechnung OpenAPI Documentation",
        version="v1",
        url="/docs/swagger.json",
        in_place=True,
    )
    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    with open(BUILD_DIR / "openapi.json", "w+", encoding="utf-8") as f:
        json.dump(openapi.swagger_dict(), f)


config_type_map = {
    marshmallow.fields.String: "string",
    marshmallow.fields.Integer: "int",
    marshmallow.fields.Boolean: "boolean",
    TimedeltaField: "timedelta, e.g. 1h",
}


def _generate_config_doc_rec(field):
    if isinstance(field, marshmallow.fields.Nested):
        out = {}
        for section_name, next_field in field.schema.fields.items():
            out[section_name] = _generate_config_doc_rec(next_field)
        return out

    if isinstance(field, marshmallow.fields.List):
        verbose_type = f"<list[{config_type_map[field.inner.__class__]}]>"
    else:
        verbose_type = f"<{config_type_map[field.__class__]}>"

    out = f"{verbose_type}"
    extra_info = []
    if description := field.metadata.get("description"):
        extra_info.append(description)

    if field.load_default:
        extra_info.append(f"default={field.load_default}")

    if field.required is not None and not field.required:
        extra_info.append("optional")

    if not extra_info:
        return out

    return f"{out} # {'; '.join(extra_info)}"


def generate_config_doc_yaml():
    output = {}
    for section_name, field in CONFIG_SCHEMA().fields.items():
        output[section_name] = _generate_config_doc_rec(field)

    output_string = yaml.dump(output).replace("'", "").replace('"', "")

    BUILD_DIR.mkdir(parents=True, exist_ok=True)
    with open(BUILD_DIR / "config_schema.yaml", "w+", encoding="utf-8") as f:
        f.write(output_string)


generate_openapi_json()
generate_config_doc_yaml()
