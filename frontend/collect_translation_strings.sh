#!/usr/bin/env bash


npx i18next 'apps/**/*.{js,jsx,ts,tsx,html}' -o 'assets/locales/$LOCALE/$NAMESPACE.json'
