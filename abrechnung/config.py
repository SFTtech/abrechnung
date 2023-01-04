import re
from datetime import timedelta
from pathlib import Path
from typing import Any, Optional, Mapping, List

import yaml
from pydantic import BaseModel


class ServiceConfig(BaseModel):
    url: str
    name: str
    api_url: str


class DemoConfig(BaseModel):
    enabled = False
    wipe_interval = timedelta(hours=1)


class ApiConfig(BaseModel):
    secret_key: str
    host: str
    port: int
    id = "default"
    max_uploadable_file_size = 1024
    enable_cors = True
    access_token_validity = timedelta(hours=1)


class RegistrationConfig(BaseModel):
    enabled = False
    allow_guest_users = False
    valid_email_domains: Optional[List[str]] = None


class DatabaseConfig(BaseModel):
    user: Optional[str] = False
    password: Optional[str] = False
    dbname: str
    host: Optional[str] = False
    port: Optional[int] = 5432


class EmailConfig(BaseModel):
    class AuthConfig(BaseModel):
        username: str
        password: str

    address: str
    host: str
    port: int
    mode = "smtp"  # oneof "local" "smtp-ssl" "smtp-starttls" "smtp"
    auth: Optional[AuthConfig] = None


class Config(BaseModel):
    service: ServiceConfig
    api: ApiConfig
    database: DatabaseConfig
    email: EmailConfig
    # in case all params are optional this is needed to make the whole section optional
    demo = DemoConfig()
    registration = RegistrationConfig()


def read_config(config_path: Path) -> Config:
    with open(config_path) as config_file:
        content = yaml.safe_load(config_file)
        config = Config(**content)
        return config
