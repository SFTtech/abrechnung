import re
from datetime import timedelta
from pathlib import Path
from typing import Any, Optional, Mapping

import yaml
from marshmallow import Schema, fields

config_timedelta_format = re.compile(
    r"((?P<hours>\d+?)h)?((?P<minutes>\d+?)m)?((?P<seconds>\d+?)s)?"
)


class TimedeltaField(fields.Field):
    def _serialize(self, value: Mapping[int, float], attr: str, obj: Any, **kwargs):
        raise NotImplementedError

    def _deserialize(
        self,
        value: Any,
        attr: Optional[str],
        data: Optional[Mapping[str, Any]],
        **kwargs,
    ):
        if not isinstance(value, str):
            raise fields.ValidationError("Expexted a string")

        parts = config_timedelta_format.match(value)
        if not parts:
            raise fields.ValidationError("Invalid timedelta format")
        groups = parts.groupdict()
        time_params = {}
        for name, param in groups.items():
            if param:
                time_params[name] = int(param)
        return timedelta(**time_params)


CONFIG_SCHEMA = Schema.from_dict(
    name="ConfigSchema",
    fields={
        "service": fields.Nested(
            Schema.from_dict(
                {
                    "url": fields.Str(
                        required=True,
                        metadata={"description": "Base HTTP frontend URL"},
                    ),
                    "name": fields.Str(
                        required=True,
                        metadata={
                            "description": "Abrechnung instance name, will be shown e.g. in the email subjects"
                        },
                    ),
                    "api_url": fields.Str(
                        required=True, metadata={"description": "Base HTTP API URL"}
                    ),
                }
            ),
            metadata={
                "description": "settings related to the general abrechnung service"
            },
        ),
        "demo": fields.Nested(
            Schema.from_dict(
                {
                    "enabled": fields.Bool(required=False, load_default=False),
                    "wipe_interval": TimedeltaField(
                        load_default=timedelta(hours=1),
                        metadata={
                            "description": "interval after which registered users and their groups will be deleted"
                        },
                    ),
                }
            ),
            required=False,
            load_default={"enabled": False, "wipe_interval": timedelta(hours=1)},
            metadata={"description": "settings related to the demo mode"},
        ),
        "database": fields.Nested(
            Schema.from_dict(
                {
                    "host": fields.Str(required=False, load_default=None),
                    "port": fields.Int(required=False, load_default=5432),
                    "user": fields.Str(required=False, load_default=None),
                    "dbname": fields.Str(required=True),
                    "password": fields.Str(required=False, load_default=None),
                }
            )
        ),
        "api": fields.Nested(
            Schema.from_dict(
                {
                    "secret_key": fields.Str(required=True),
                    "host": fields.Str(required=True),
                    "port": fields.Int(required=True),
                    "id": fields.Str(
                        metadata={
                            "description": "id of the abrechnung api worker instance in case of multiple running"
                        },
                        required=False,
                        load_default="default",
                    ),
                    "max_uploadable_file_size": fields.Int(
                        load_default=1024,
                        required=False,
                        metadata={"description": "max file size for uploads in KB"},
                    ),  # in KB
                    "enable_cors": fields.Bool(required=False, load_default=True),
                }
            )
        ),
        "registration": fields.Nested(
            Schema.from_dict(
                {
                    "enabled": fields.Bool(
                        required=False,
                        load_default=False,
                        metadata={"description": "allow anyone to register"},
                    ),
                    "allow_guest_users": fields.Bool(
                        required=False,
                        load_default=False,
                        metadata={
                            "description": "allow guest users to register with a valid group invite"
                        },
                    ),
                    "valid_email_domains": fields.List(
                        fields.Str(),
                        required=False,
                        load_default=None,
                        metadata={
                            "description": "restrict the registration to only allow emails from specific domains"
                        },
                    ),
                }
            )
        ),
        "email": fields.Nested(
            Schema.from_dict(
                {
                    "address": fields.Str(required=True),
                    "host": fields.Str(required=True),
                    "port": fields.Int(required=True),
                    "mode": fields.Str(
                        required=False,
                        metadata={
                            "description": "email mode, one of local, smtp-ssl, smtp-starttls, smtp"
                        },
                        load_default="smtp",
                    ),
                    "auth": fields.Nested(
                        Schema.from_dict(
                            {"username": fields.Str(), "password": fields.Str()},
                            name="MailAuthSchema",
                        ),
                        required=False,
                    ),
                }
            )
        ),
    },
)


class Config:
    def __init__(self, cfg: dict):
        self._cfg = cfg

    def get(self, key, default=None):
        return self._cfg.get(key, default)

    def __getitem__(self, key):
        return self._cfg.__getitem__(key)

    @classmethod
    def from_dict(cls, cfg: dict) -> "Config":
        cfg = CONFIG_SCHEMA().load(cfg)
        return cls(cfg)

    @classmethod
    def from_file(cls, file_path: Path) -> "Config":
        with file_path.open("r") as f:
            cfg = yaml.safe_load(f)
            cfg = CONFIG_SCHEMA().load(cfg)
            return cls(cfg)
