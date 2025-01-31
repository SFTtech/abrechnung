#!/usr/bin/python3

# type: ignore  # mypy does not like aiohttp multipart for some reason

import argparse
import os
import subprocess

from aiohttp import web  # pylint: disable=all

routes = web.RouteTableDef()


async def copy_file_to_container(request: web.Request, srcfile: str, destfile: str):
    container = request.app["container_host"]
    subprocess.check_call(["scp", srcfile, f"root@{container}:{destfile}"])


async def run_in_container(request: web.Request, args: list[str]):
    container = request.app["container_host"]
    subprocess.check_call(["ssh", f"root@{container}", " ".join(args)])


@routes.post(r"/sft-deploy/{secret:\w+}")
async def hook(request: web.Request):
    if request.match_info["secret"] != request.app["webhook_secret"]:
        raise web.HTTPUnauthorized

    reader = await request.multipart()

    archive_name = "/root/abrechnung_latest.deb"

    with open("/tmp/abrechnung_latest.deb", "wb+") as f:
        field = await reader.next()
        if not field or not field.name == "archive":
            raise web.HTTPBadRequest
        filename = field.filename
        size = 0
        while True:
            chunk = await field.read_chunk()
            if not chunk:
                break
            size += len(chunk)
            f.write(chunk)

        print(f"Upload successful, received {filename} of size {size} bytes.")

    await copy_file_to_container(request, "/tmp/abrechnung_latest.deb", archive_name)
    await run_in_container(
        request,
        [
            "DEBIAN_FRONTEND=noninteractive",
            "apt-get",
            '-o "Dpkg::Options::=--force-confdef"',
            '-o "Dpkg::Options::=--force-confold"',
            "install",
            "-y",
            "--reinstall",
            archive_name,
        ],
    )
    await run_in_container(request, ["abrechnung", "-vvv", "db", "rebuild"])
    await run_in_container(request, ["systemctl", "daemon-reload"])
    await run_in_container(request, ["systemctl", "restart", "abrechnung-api.service"])
    await run_in_container(request, ["systemctl", "restart", "abrechnung-mailer.service"])

    return web.Response(text="Successful deploy")


def main():
    cli = argparse.ArgumentParser()
    cli.add_argument("--host", type=str, default="localhost")
    cli.add_argument("-p", "--port", type=int, default=1337)
    cli.add_argument("--container-host", type=str, default="10.0.3.10")
    args = cli.parse_args()

    webhook_secret = os.environ.get("WEBHOOK_SECRET")
    if not webhook_secret:
        cli.error("Required to set the webhook secret in the 'WEBHOOK_SECRET' env variable")

    app = web.Application()
    app.add_routes(routes)
    app["webhook_secret"] = webhook_secret
    app["container_host"] = args.container_host
    web.run_app(app, host=args.host, port=args.port)


if __name__ == "__main__":
    main()
