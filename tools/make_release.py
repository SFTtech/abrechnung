import argparse
import json
import re
import subprocess
from pathlib import Path

repo_root = Path(__file__).parent.parent


def parse_args():
    parser = argparse.ArgumentParser("Abrechnung release utility")
    parser.add_argument("part", type=str, choices=["minor", "major", "patch"])
    parser.add_argument("--dry-run", action="store_true")

    return parser.parse_args()


def _get_next_version(part: str) -> tuple[str, str]:
    ret = subprocess.run(["bump-my-version", "show", "--format", "json", "--increment", part], capture_output=True)
    result = json.loads(ret.stdout)
    return result["current_version"], result["new_version"]


def main(part: str, dry_run: bool):
    # print current then prompt for new API compatibility version ranges
    # call bumpversion
    current_version, next_version = _get_next_version(part)
    print(f"Current Version: {current_version}, Upgrading to version {next_version}")

    bump_my_version_args = ["bump-my-version", "bump", part, "--dry-run", "--no-commit", "--no-tag"]
    if dry_run:
        bump_my_version_args.append("--dry-run")
    subprocess.run(bump_my_version_args, check=True)

    app_build_gradle = repo_root / "frontend" / "apps" / "mobile" / "android" / "app" / "build.gradle"
    gradle_content = app_build_gradle.read_text()
    if not dry_run:
        version_code_match = re.match(".*versionCode (?P<version>\d+)\n.*", gradle_content)
        code = int(version_code_match.group("version"))
        gradle_content.replace(f"versionCode {code}", f"versionCode {code + 1}")
        app_build_gradle.write_text(gradle_content)

    # generated changelog from commits / merges / whatever
    # print current changelog
    # prompt for additional changelog entries
    # finalize changelog and write
    # copy changelog to debian changelog


if __name__ == "__main__":
    args = parse_args()
    main(part=args.part, dry_run=args.dry_run)
