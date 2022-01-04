"""
Taken from https://github.com/maximdanilchenko/aiohttp-apispec

aiohttp-apispec is release under the MIT License

Copyright (c) 2017 Maksim Danilchenko
"""

from .setup import setup_aiohttp_apispec
from .decorators import (
    docs,
    request_schema,
    match_info_schema,
    querystring_schema,
    form_schema,
    json_schema,
    headers_schema,
    cookies_schema,
    response_schema,
    use_kwargs,
    marshal_with,
)
from .middlewares import validation_middleware

__all__ = [
    # setup
    "setup_aiohttp_apispec",
    # decorators
    "docs",
    "request_schema",
    "match_info_schema",
    "querystring_schema",
    "form_schema",
    "json_schema",
    "headers_schema",
    "cookies_schema",
    "response_schema",
    "use_kwargs",
    "marshal_with",
    # middleware
    "validation_middleware",
]
