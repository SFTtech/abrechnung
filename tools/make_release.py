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
    ret = subprocess.run(
        ["bump-my-version", "show", "--format", "json", "--increment", part], capture_output=True, check=True
    )
    result = json.loads(ret.stdout)
    return result["current_version"], result["new_version"]


def main(part: str, dry_run: bool):
    if dry_run:
        print("Performing a dry run ...")
    # print current then prompt for new API compatibility version ranges
    current_version, next_version = _get_next_version(part)
    print(f"Current Version: {current_version}, Upgrading to version {next_version}")

    bump_my_version_args = ["bump-my-version", "bump", part, "--no-commit", "--no-tag"]
    if dry_run:
        bump_my_version_args.append("--dry-run")
    subprocess.run(bump_my_version_args, check=True)

    app_build_gradle = repo_root / "frontend" / "apps" / "mobile" / "android" / "app" / "build.gradle"
    gradle_content = app_build_gradle.read_text()
    if not dry_run:
        version_code_matches = re.findall(r"versionCode (?P<version>\d+)", gradle_content)
        for match in version_code_matches:
            code = int(match)
            gradle_content = gradle_content.replace(f"versionCode {code}", f"versionCode {code + 1}")
            app_build_gradle.write_text(gradle_content)

    print("Do not forget to update the api version compatibilities")
    print("Do not forget to add a debian changelog entry")

    # generated changelog from commits / merges / whatever
    # print current changelog
    # prompt for additional changelog entries
    # finalize changelog and write
    # copy changelog to debian changelog


if __name__ == "__main__":
    args = parse_args()
    main(part=args.part, dry_run=args.dry_run)
