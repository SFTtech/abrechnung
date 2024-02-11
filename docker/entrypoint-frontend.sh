#!/bin/sh

CONF="/etc/nginx/conf.d/default.conf"

if [ -n "${ABRECHNUNG_API__HOST}" ]; then
    sed -i "s/ api:/ ${ABRECHNUNG_API__HOST}:/g" "$CONF"
fi

if [ -n "${ABRECHNUNG_API__PORT}" ]; then
    sed -i "s/:8080;/:${ABRECHNUNG_API__PORT};/g" "$CONF"
fi

if [ ! -f "/proc/net/if_inet6" ]; then
    sed -i "s/ listen \[::\]/ #listen \[::\]/g" "$CONF"
fi
