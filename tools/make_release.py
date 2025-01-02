import argparse
import subprocess
import tomllib
from datetime import datetime
from pathlib import Path

from pydantic import BaseModel

repo_root = Path(__file__).parent.parent

debian_changelog_template = """abrechnung ({new_version}) stable; urgency=medium

  * Abrechnung release {new_version}

 -- {author_name} <{author_email}>  {now:%a, %-d %b %Y %H:%M:%S %z}

"""
unreleased_changelog_template = """## Unreleased

[Compare the full difference.](https://github.com/SFTtech/abrechnung/compare/v{new_version}...HEAD)

"""


class Config(BaseModel):
    current_version: str
    new_version: str


def parse_args():
    parser = argparse.ArgumentParser("Abrechnung release utility")
    parser.add_argument("part", type=str, choices=["minor", "major", "patch"])
    parser.add_argument("--dry-run", action="store_true")

    return parser.parse_args()


def _get_bumpversion_config(part: str) -> Config:
    ret = subprocess.run(
        ["bump-my-version", "show", "--format", "json", "--increment", part], capture_output=True, check=True
    )
    return Config.model_validate_json(ret.stdout)


def _read_pyproject_toml():
    with open(repo_root / "pyproject.toml", "rb") as f:
        return tomllib.load(f)


def _update_debian_changelog(pyproject: dict, config: Config, dry_run: bool):
    formatted_debian_changelog = debian_changelog_template.format(
        new_version=config.new_version,
        now=datetime.now(),
        author_name=pyproject["project"]["authors"][0]["name"],
        author_email=pyproject["project"]["authors"][0]["email"],
    )
    print("Adding release entry to debian changelog")
    deb_changelog_path = repo_root / "debian" / "changelog"
    current_deb_changelog = deb_changelog_path.read_text()
    new_changelog = formatted_debian_changelog + current_deb_changelog
    if not dry_run:
        deb_changelog_path.write_text(new_changelog, "utf-8")


def _update_changelog(config: Config, dry_run: bool):
    # re-add the unreleased header to the changelog
    formatted_unreleased_changelog = unreleased_changelog_template.format(
        new_version=config.new_version,
    )
    changelog_path = repo_root / "CHANGELOG.md"
    current_changelog = changelog_path.read_text()
    first_line_end = current_changelog.find("\n\n")
    new_changelog = (
        current_changelog[: first_line_end + 2]
        + formatted_unreleased_changelog
        + current_changelog[first_line_end + 2 :]
    )
    print("Adding unreleased section to CHANGELOG.md")
    if not dry_run:
        changelog_path.write_text(
            new_changelog,
            "utf-8",
        )


def main(part: str, dry_run: bool):
    if dry_run:
        print("Performing a dry run ...")

    # print current then prompt for new API compatibility version ranges
    config = _get_bumpversion_config(part)
    pyproject = _read_pyproject_toml()
    print(f"Current Version: {config.current_version}, Upgrading to version {config.new_version}")

    bump_my_version_args = ["bump-my-version", "bump", part, "--no-commit", "--no-tag"]
    if dry_run:
        bump_my_version_args.append("--dry-run")
    subprocess.run(bump_my_version_args, check=True)

    _update_debian_changelog(pyproject, config, dry_run)
    _update_changelog(config, dry_run)

    print("Do not forget to update the api version compatibilities")


if __name__ == "__main__":
    args = parse_args()
    main(part=args.part, dry_run=args.dry_run)
