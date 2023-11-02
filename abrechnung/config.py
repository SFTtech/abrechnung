from datetime import timedelta
from pathlib import Path
from typing import List, Optional

import yaml
from pydantic import BaseModel

from abrechnung.framework.database import DatabaseConfig


class ServiceConfig(BaseModel):
    url: str
    name: str
    api_url: str


class DemoConfig(BaseModel):
    enabled: bool = False
    wipe_interval: timedelta = timedelta(hours=1)


class ApiConfig(BaseModel):
    secret_key: str
    host: str
    port: int
    id: str = "default"
    max_uploadable_file_size: int = 1024
    enable_cors: bool = True


class RegistrationConfig(BaseModel):
    enabled: bool = False
    allow_guest_users: bool = False
    valid_email_domains: Optional[List[str]] = None


class EmailConfig(BaseModel):
    class AuthConfig(BaseModel):
        username: str
        password: str

    address: str
    host: str
    port: int
    mode: str = "smtp"  # oneof "local" "smtp-ssl" "smtp-starttls" "smtp"
    auth: Optional[AuthConfig] = None


class Config(BaseModel):
    service: ServiceConfig
    api: ApiConfig
    database: DatabaseConfig
    email: EmailConfig
    # in case all params are optional this is needed to make the whole section optional
    demo: DemoConfig = DemoConfig()
    registration: RegistrationConfig = RegistrationConfig()


def read_config(config_path: Path) -> Config:
    content = config_path.read_text("utf-8")
    config = Config(**yaml.safe_load(content))
    return config
