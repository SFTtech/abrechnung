#!/bin/sh

CONF="/etc/nginx/conf.d/default.conf"

[[ ! -z "${ABRECHNUNG_API__HOST}" ]] && sed -i "s/api:/${ABRECHNUNG_API__HOST}:/g" "$CONF"
[[ ! -z "${ABRECHNUNG_API__PORT}" ]] && sed -i "s/:8080/:${ABRECHNUNG_API__PORT}/g" "$CONF"
[[ ! -f "/proc/net/if_inet6" ]] && sed -i "s/listen \[::\]/#listen \[::\]/g" "$CONF"
