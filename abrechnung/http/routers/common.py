from fastapi import APIRouter
from pydantic import BaseModel

from abrechnung import MAJOR_VERSION, MINOR_VERSION, PATCH_VERSION, __version__

router = APIRouter(
    prefix="/api",
    tags=["common"],
)


class VersionResponse(BaseModel):
    version: str
    major_version: int
    minor_version: int
    patch_version: int

    class Config:
        json_schema_extra = {
            "example": {
                "version": "1.3.2",
                "major_version": 1,
                "minor_version": 3,
                "patch_version": 2,
            }
        }


@router.get("/version", response_model=VersionResponse, operation_id="get_version")
async def get_version():
    return {
        "version": __version__,
        "major_version": MAJOR_VERSION,
        "minor_version": MINOR_VERSION,
        "patch_version": PATCH_VERSION,
    }
