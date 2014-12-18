connect-mongo-ttl-error-example
===============================

attempt to recreate "Error setting TTL index on collection" kcbanner/connect-mongo#80

You'll want to, of course, `npm install`.  Since the server is HTTPS enabled, I provided my key/certificate generation script (requires openssl).

    $ ./gen-key-cert.sh

I would suggest at least using `DEBUG="connect-mongo-ttl-error-test"`
