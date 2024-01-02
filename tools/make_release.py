import argparse
import subprocess


def parse_args():
    parser = argparse.ArgumentParser("Abrechnung release utility")
    parser.add_argument("part", type=str, choices=["minor", "major", "patch"])
    parser.add_argument("--dry-run", action="store_true")

    return parser.parse_args()


def main(part: str, dry_run: bool):
    # print current then prompt for new API compatibility version ranges
    # call bumpversion
    bump_my_version_args = ["bump-my-version", "bump", part, "--dry-run"]
    if dry_run:
        bump_my_version_args.append("--dry-run")
    subprocess.run(bump_my_version_args, check=True)
    # generated changelog from commits / merges / whatever
    # print current changelog
    # prompt for additional changelog entries
    # finalize changelog and write
    # copy changelog to debian changelog


if __name__ == "__main__":
    args = parse_args()
    main(part=args.part, dry_run=args.dry_run)
