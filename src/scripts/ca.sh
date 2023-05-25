#!/bin/sh

openssl req -new -x509 -extensions v3_ca -keyout cakey.key -passout "pass:treble" -out cacert.crt -subj "/CN=MDM Test CA" -days 365
