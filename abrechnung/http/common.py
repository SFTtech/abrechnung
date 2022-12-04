from abrechnung import __version__, MAJOR_VERSION, MINOR_VERSION, PATCH_VERSION
from abrechnung.http.openapi import docs
from abrechnung.http.utils import json_response, PrefixedRouteTableDef

routes = PrefixedRouteTableDef("/api")


@routes.get("/version")
@docs(summary="retrieve the version of the backend", description="")
async def version(request):
    return json_response(
        {
            "version": __version__,
            "major_version": MAJOR_VERSION,
            "minor_version": MINOR_VERSION,
            "patch_version": PATCH_VERSION,
        }
    )
