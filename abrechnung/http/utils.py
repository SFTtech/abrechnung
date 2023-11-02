from datetime import date, datetime
from uuid import UUID


def encode_json(obj):
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    if isinstance(obj, UUID):
        return str(obj)

    raise TypeError(f"Type {type(obj)} is not serializable")
