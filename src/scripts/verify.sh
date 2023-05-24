#!/bin/sh

TEMP=$(mktemp -p . --suffix=.xml content.XXXXXXXXXX) || exit 1
trap 'rm -- "$TEMP"' EXIT

# printf "%s" "$2" > "$TEMP"
echo "$2" > "$TEMP"

echo "$1" | base64 -d | openssl cms -verify -binary -inform der -content $TEMP -noverify > /dev/null
echo "$1" | base64 -d | openssl pkcs7 -print_certs -inform der