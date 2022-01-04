import logging
from typing import Callable, Optional

from aiohttp import web

logger = logging.getLogger(__name__)


def setup_aiohttp_apispec(
    app: web.Application,
    *,
    title: str = "API documentation",
    version: str = "0.0.1",
    url: str = "/api/docs/swagger.json",
    request_data_name: str = "data",
    error_callback=None,
    in_place: bool = False,
    prefix: str = "",
    schema_name_resolver: Optional[Callable] = None,
    **kwargs
):
    """
    aiohttp-apispec extension.

    Usage:

    .. code-block:: python

        from aiohttp_apispec import docs, request_schema, setup_aiohttp_apispec
        from aiohttp import web
        from marshmallow import Schema, fields


        class RequestSchema(Schema):
            id = fields.Int()
            name = fields.Str(description='name')
            bool_field = fields.Bool()


        @docs(tags=['mytag'],
              summary='Test method summary',
              description='Test method description')
        @request_schema(RequestSchema)
        async def index(request):
            return web.json_response({'msg': 'done', 'data': {}})


        app = web.Application()
        app.router.add_post('/v1/test', index)

        # init docs with all parameters, usual for ApiSpec
        setup_aiohttp_apispec(app=app,
                              title='My Documentation',
                              version='v1',
                              url='/api/docs/api-docs')

        # now we can find it on 'http://localhost:8080/api/docs/api-docs'
        web.run_app(app)

    :param Application app: aiohttp web app
    :param str title: API title
    :param str version: API version
    :param str url: url for swagger spec in JSON format
    :param str request_data_name: name of the key in Request object
                                  where validated data will be placed by
                                  validation_middleware (``'data'`` by default)
    :param error_callback: custom error handler
    :param in_place: register all routes at the moment of calling this function
                     instead of the moment of the on_startup signal.
                     If True, be sure all routes are added to router
    :param prefix: prefix to add to all registered routes
    :param schema_name_resolver: custom schema_name_resolver for MarshmallowPlugin.
    :param kwargs: any apispec.APISpec kwargs
    """
    try:
        from .openapi import AiohttpApiSpec, resolver
    except ImportError:
        logger.warning(
            "disabling openapi spec generation as 'apispec' and or 'webargs' are not installed"
        )
        return None

    if schema_name_resolver is None:
        schema_name_resolver = resolver

    return AiohttpApiSpec(
        url,
        app,
        request_data_name,
        title=title,
        version=version,
        error_callback=error_callback,
        in_place=in_place,
        prefix=prefix,
        schema_name_resolver=schema_name_resolver,
        **kwargs
    )
