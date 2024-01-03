import subprocess
import sys
from os import execlp, execvp, getenv, makedirs

from yaml import dump, safe_load


def to_bool(data: str):
    return data.lower() in [
        "true",
        "1",
        "t",
        "y",
        "yes",
        "on",
    ]


abrechnung_venv_python = "/opt/abrechnung-venv/bin/python3"

print("generating config")
config = {}
filename = "/etc/abrechnung/abrechnung.yaml"
with open(filename, "r", encoding="utf-8") as filehandle:
    config = safe_load(filehandle)

if not "service" in config:
    config["service"] = {}
if not "database" in config:
    config["database"] = {}
if not "registration" in config:
    config["registration"] = {}
if not "email" in config:
    config["email"] = {}

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

config["registration"]["allow_guest_users"] = to_bool(getenv("REGISTRATION_ALLOW_GUEST_USERS", "false"))
config["registration"]["enabled"] = to_bool(getenv("REGISTRATION_ENABLED", "false"))
config["registration"]["valid_email_domains"] = getenv("REGISTRATION_VALID_EMAIL_DOMAINS", "false").split(",")

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
    subprocess.run([abrechnung_venv_python, "-m", "abrechnung", "db", "migrate"], shell=True, check=True)
    print("migrated")
if sys.argv[1] == "cron":
    print("running cron...")
    sys.stdout.flush()
    execlp("crond", "crond", "-f")
print(f"starting abrechnung with forwarded argv {sys.argv}")
sys.stdout.flush()
execvp(abrechnung_venv_python, [abrechnung_venv_python, "-m", "abrechnung"] + sys.argv[1:])
