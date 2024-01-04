import subprocess
import sys
from os import execlp, execvp

abrechnung_venv_python = "/opt/abrechnung-venv/bin/python3"

if sys.argv[1] == "api":
    print("migrating ...")
    subprocess.run([abrechnung_venv_python, "-m", "abrechnung", "-vvv", "db", "migrate"], check=True, stdout=sys.stdout)
    print("migrated")

if sys.argv[1] == "cron":
    print("running cron...")
    execlp("crond", "crond", "-f")

print(f"starting abrechnung with forwarded argv {sys.argv}")
execvp(abrechnung_venv_python, [abrechnung_venv_python, "-m", "abrechnung"] + sys.argv[1:])
