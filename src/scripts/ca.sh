#!/bin/sh

openssl req -new -x509 -extensions v3_ca -keyout cakey.key -out cacert.crt -days 365
