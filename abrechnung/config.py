from pathlib import Path

import schema
import yaml

CONFIG_SCHEMA = schema.Schema(
    {
        "service": {"url": str, "name": str, "api_url": str},
        "database": {
            "host": str,
            schema.Optional("port"): int,
            "user": str,
            "dbname": str,
            "password": str,
        },
        "api": {
            "secret_key": str,
            "host": str,
            "port": int,
            "id": str,
            schema.Optional("max_uploadable_file_size", default=1024): int,  # in KB
            schema.Optional("enable_cors"): bool,
            schema.Optional("enable_registration"): bool,
            schema.Optional("valid_email_domains"): [str],
        },
        "email": {
            "address": str,
            "host": str,
            "port": int,
            schema.Optional("mode"): str,
            schema.Optional("auth"): {"username": str, "password": str},
        },
    }
)


class Config:
    def __init__(self, cfg: dict):
        self._cfg = cfg

    def get(self, key, default=None):
        return self._cfg.get(key, default)

    def __getitem__(self, key):
        return self._cfg.__getitem__(key)

    @classmethod
    def from_file(cls, file_path: Path):
        with file_path.open("r") as f:
            cfg = yaml.safe_load(f)
            CONFIG_SCHEMA.validate(cfg)
            return cls(cfg)
