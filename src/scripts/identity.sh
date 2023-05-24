#!/bin/sh

TEMP=$(mktemp -p . -d identity.XXXXXXXXXX) || exit 1
trap 'rm -- -rf "$TEMP"' EXIT

openssl genrsa 2048 > "$TEMP/identity.key"
openssl req -new -key "$TEMP/identity.key" -out "$TEMP/identity.csr" -subj "$1"

openssl x509 -req -days 365 -in "$TEMP/identity.csr" -CA "$3" -CAkey "$2" -CAcreateserial -out "$TEMP/identity.crt" -passin "pass:$4"
openssl pkcs12 -export -out "$TEMP/identity.p12" -inkey "$TEMP/identity.key" -in "$TEMP/identity.crt" -certfile "$3" -passout "pass:$4"

identity=$(base64 "$TEMP/identity.p12")
echo $identity