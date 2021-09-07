#!/usr/bin/env python3

import argparse
import os

from abrechnung.database.revisions import SchemaRevision, REVISION_DIR


def main(name: str):
    revisions = SchemaRevision.revisions_from_dir(REVISION_DIR)
    filename = f"{str(len(revisions) + 1).zfill(4)}_{name}.sql"
    new_revision_version = os.urandom(4).hex()
    file_path = REVISION_DIR / filename
    with file_path.open("w+") as f:
        f.write(
            f"-- revision: {new_revision_version}\n"
            f"-- requires: {revisions[-1].version}\n"
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        prog="DB utilty", description="Utility to create new database revision files"
    )
    parser.add_argument("name", type=str)
    args = parser.parse_args()
    main(args.name)
