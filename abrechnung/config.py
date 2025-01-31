import enum
from datetime import timedelta
from pathlib import Path
from typing import List, Literal, Optional, Tuple, Type

import yaml
from pydantic import BaseModel, EmailStr
from pydantic_settings import (
    BaseSettings,
    PydanticBaseSettingsSource,
    SettingsConfigDict,
)
from sftkit.database import DatabaseConfig
from sftkit.http import HTTPServerConfig


class ServiceMessageType(enum.Enum):
    info = "info"
    error = "error"
    warning = "warning"
    success = "success"


class ServiceMessage(BaseModel):
    type: ServiceMessageType
    title: str | None = None
    body: str


class ServiceConfig(BaseModel):
    name: str

    messages: list[ServiceMessage] | None = None
    imprint_url: str | None = None
    source_code_url: str = "https://github.com/SFTtech/abrechnung"
    issue_tracker_url: str = "https://github.com/SFTtech/abrechnung/issues"


class DemoConfig(BaseModel):
    enabled: bool = False
    wipe_interval: timedelta = timedelta(hours=1)


class ApiConfig(HTTPServerConfig):
    secret_key: str
    id: str = "default"
    max_uploadable_file_size: int = 1024
    enable_cors: bool = True


class RegistrationConfig(BaseModel):
    enabled: bool = False
    allow_guest_users: bool = False
    valid_email_domains: Optional[List[str]] = None
    require_email_confirmation: bool = True


class EmailConfig(BaseModel):
    class AuthConfig(BaseModel):
        username: str
        password: str

    address: EmailStr
    host: str
    port: int
    mode: Literal["local", "smtp-ssl", "smtp", "smtp-starttls"] = "smtp"
    auth: Optional[AuthConfig] = None


class MetricsConfig(BaseModel):
    enabled: bool = False
    expose_money_amounts: bool = False


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ABRECHNUNG_", env_nested_delimiter="__")

    service: ServiceConfig
    api: ApiConfig
    database: DatabaseConfig
    email: EmailConfig
    # in case all params are optional this is needed to make the whole section optional
    demo: DemoConfig = DemoConfig()
    registration: RegistrationConfig = RegistrationConfig()
    metrics: MetricsConfig = MetricsConfig()

    @classmethod
    def settings_customise_sources(
        cls,
        settings_cls: Type[BaseSettings],
        init_settings: PydanticBaseSettingsSource,
        env_settings: PydanticBaseSettingsSource,
        dotenv_settings: PydanticBaseSettingsSource,
        file_secret_settings: PydanticBaseSettingsSource,
    ) -> Tuple[PydanticBaseSettingsSource, ...]:
        return env_settings, init_settings, dotenv_settings, file_secret_settings


def read_config(config_path: Path) -> Config:
    content = config_path.read_text("utf-8")
    loaded = yaml.safe_load(content)
    config = Config(**loaded)
    return config
