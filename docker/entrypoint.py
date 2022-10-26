#!/usr/bin/env python
from yaml import safe_load, dump
import sys
from os import execvp, execlp, getenv, makedirs
import subprocess


def to_bool(data: str):
    return data.lower() in [
        "true",
        "1",
        "t",
        "y",
        "yes",
        "on",
    ]


print("generating config")
config = dict()
filename = "/usr/share/abrechnung/config/abrechnung.yaml"
with open(filename, "r", encoding="utf-8") as filehandle:
    config = safe_load(filehandle)

if not "service" in config:
    config["service"] = dict()
if not "database" in config:
    config["database"] = dict()
if not "registration" in config:
    config["registration"] = dict()
if not "email" in config:
    config["email"] = dict()

config["service"]["url"] = getenv("SERVICE_URL", "https://localhost")
config["service"]["api_url"] = getenv("SERVICE_API_URL", "https://localhost/api")
config["service"]["name"] = getenv("SERVICE_NAME", "Abrechnung")
config["database"]["host"] = getenv("DB_HOST")
config["database"]["user"] = getenv("DB_USER")
config["database"]["dbname"] = getenv("DB_NAME")
config["database"]["password"] = getenv("DB_PASSWORD")

config["api"]["secret_key"] = getenv("ABRECHNUNG_SECRET")
config["api"]["host"] = "0.0.0.0"
config["api"]["port"] = int(getenv("ABRECHNUNG_PORT", "8080"))
config["api"]["id"] = getenv("ABRECHNUNG_ID", "default")

config["registration"]["allow_guest_users"] = to_bool(
    getenv("REGISTRATION_ALLOW_GUEST_USERS", "false")
)
config["registration"]["enabled"] = to_bool(getenv("REGISTRATION_ENABLED", "false"))
config["registration"]["valid_email_domains"] = getenv(
    "REGISTRATION_VALID_EMAIL_DOMAINS", "false"
).split(",")

config["email"]["address"] = getenv("ABRECHNUNG_EMAIL", "")
config["email"]["host"] = getenv("SMTP_HOST", "localhost")
config["email"]["port"] = int(getenv("SMTP_PORT", "587"))
config["email"]["mode"] = getenv("SMTP_MODE", "smtp-starttls")

if getenv("SMTP_USER", None):
    if not "auth" in config["email"]:
        config["email"]["auth"] = dict()

    config["email"]["auth"]["username"] = getenv("SMTP_USER", None)
    config["email"]["auth"]["password"] = getenv("SMTP_PASSWORD", None)

output = dump(config)
makedirs("/etc/abrechnung/", exist_ok=True)
with open("/etc/abrechnung/abrechnung.yaml", "w", encoding="utf-8") as file:
    file.write(output)
print("config done")
sys.stdout.flush()
if sys.argv[1] == "api":
    print("migrating")
    sys.stdout.flush()
    subprocess.run("abrechnung db migrate", shell=True, check=True)
    print("migrated")
if sys.argv[1] == "cron":
    print("running cron...")
    sys.stdout.flush()
    execlp("crond", "crond", "-f")
print("starting abrechnung...")
sys.stdout.flush()
execvp("abrechnung", sys.argv)
