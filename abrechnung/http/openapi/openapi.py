import copy
from typing import Awaitable, Callable

from aiohttp import web
from aiohttp.hdrs import METH_ALL, METH_ANY
from apispec import APISpec
from apispec.core import VALID_METHODS_OPENAPI_V2
from apispec.ext.marshmallow import MarshmallowPlugin, common
from webargs.aiohttpparser import parser

from .utils import get_path, get_path_keys, issubclass_py37fix

_AiohttpView = Callable[[web.Request], Awaitable[web.StreamResponse]]

VALID_RESPONSE_FIELDS = {"description", "headers", "examples"}

NAME_SWAGGER_SPEC = "swagger.spec"


def resolver(schema):
    schema_instance = common.resolve_schema_instance(schema)
    prefix = "Partial-" if schema_instance.partial else ""
    schema_cls = common.resolve_schema_cls(schema)
    name = prefix + schema_cls.__name__
    if name.endswith("Schema"):
        return name[:-6] or name
    return name


class AiohttpApiSpec:
    def __init__(
        self,
        url="/api/docs/swagger.json",
        app=None,
        request_data_name="data",
        error_callback=None,
        in_place=False,
        prefix="",
        schema_name_resolver=resolver,
        **kwargs
    ):

        self.plugin = MarshmallowPlugin(schema_name_resolver=schema_name_resolver)
        self.spec = APISpec(plugins=(self.plugin,), openapi_version="2.0", **kwargs)

        self.url = url
        self._registered = False
        self._request_data_name = request_data_name
        self.error_callback = error_callback
        self.prefix = prefix
        self._index_page = None
        if app is not None:
            self.register(app, in_place)

    def swagger_dict(self):
        """Returns swagger spec representation in JSON format"""
        return self.spec.to_dict()

    def register(self, app: web.Application, in_place: bool = False):
        """Creates spec based on registered app routes and registers needed view"""
        if self._registered is True:
            return None

        app["_apispec_request_data_name"] = self._request_data_name

        if self.error_callback:
            parser.error_callback = self.error_callback
        app["_apispec_parser"] = parser

        if in_place:
            self._register(app)
        else:

            async def doc_routes(app_):
                self._register(app_)

            app.on_startup.append(doc_routes)

        self._registered = True

        if self.url is not None:

            async def swagger_handler(request):
                return web.json_response(request.app["swagger_dict"])

            route_url = self.url
            if not self.url.startswith("/"):
                route_url = "/{}".format(self.url)
            app.router.add_route(
                "GET", route_url, swagger_handler, name=NAME_SWAGGER_SPEC
            )

    def _register(self, app: web.Application):
        for route in app.router.routes():
            if issubclass_py37fix(route.handler, web.View) and route.method == METH_ANY:
                for attr in dir(route.handler):
                    if attr.upper() in METH_ALL:
                        view = getattr(route.handler, attr)
                        method = attr
                        self._register_route(route, method, view)
            else:
                method = route.method.lower()
                view = route.handler
                self._register_route(route, method, view)
        app["swagger_dict"] = self.swagger_dict()

    def _register_route(
        self, route: web.AbstractRoute, method: str, view: _AiohttpView
    ):

        if not hasattr(view, "__apispec__"):
            return None

        url_path = get_path(route)
        if not url_path:
            return None

        self._update_paths(view.__apispec__, method, self.prefix + url_path)  # type: ignore

    def _update_paths(self, data: dict, method: str, url_path: str):
        if method not in VALID_METHODS_OPENAPI_V2:
            return None
        for schema in data.pop("schemas", []):
            parameters = self.plugin.converter.schema2parameters(
                schema["schema"], **schema["options"]
            )
            self._add_examples(schema["schema"], parameters, schema["example"])
            data["parameters"].extend(parameters)

        existing = [p["name"] for p in data["parameters"] if p["in"] == "path"]
        data["parameters"].extend(
            {"in": "path", "name": path_key, "required": True, "type": "string"}
            for path_key in get_path_keys(url_path)
            if path_key not in existing
        )

        if "responses" in data:
            responses = {}
            for code, actual_params in data["responses"].items():
                if "schema" in actual_params:
                    raw_parameters = self.plugin.converter.schema2parameters(
                        actual_params["schema"],
                        location="json",
                        required=actual_params.get("required", False),
                    )[0]
                    updated_params = {
                        k: v
                        for k, v in raw_parameters.items()
                        if k in VALID_RESPONSE_FIELDS
                    }
                    updated_params["schema"] = actual_params["schema"]
                    for extra_info in ("description", "headers", "examples"):
                        if extra_info in actual_params:
                            updated_params[extra_info] = actual_params[extra_info]
                    responses[code] = updated_params
                else:
                    responses[code] = actual_params
            data["responses"] = responses

        operations = copy.deepcopy(data)
        self.spec.path(path=url_path, operations={method: operations})

    def _add_examples(self, ref_schema, endpoint_schema, example):
        def add_to_endpoint_or_ref():
            if add_to_refs:
                self.spec.components._schemas[name]["example"] = example
            else:
                endpoint_schema[0]["schema"]["allOf"] = [
                    endpoint_schema[0]["schema"].pop("$ref")
                ]
                endpoint_schema[0]["schema"]["example"] = example

        if not example:
            return
        schema_instance = common.resolve_schema_instance(ref_schema)
        name = self.plugin.converter.schema_name_resolver(schema_instance)
        add_to_refs = example.pop("add_to_refs")
        if self.spec.components.openapi_version.major < 3:
            if name and name in self.spec.components._schemas:
                add_to_endpoint_or_ref()
        else:
            add_to_endpoint_or_ref()
