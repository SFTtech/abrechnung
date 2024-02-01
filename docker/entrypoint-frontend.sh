#!/bin/sh

CONF="/etc/nginx/conf.d/default.conf"

[ -n "${ABRECHNUNG_API__HOST}" ] && sed -i "s/api:/${ABRECHNUNG_API__HOST}:/g" "$CONF"
[ -n "${ABRECHNUNG_API__PORT}" ] && sed -i "s/:8080/:${ABRECHNUNG_API__PORT}/g" "$CONF"
[ ! -f "/proc/net/if_inet6" ] && sed -i "s/listen \[::\]/#listen \[::\]/g" "$CONF"
