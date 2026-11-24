#!/bin/sh
# preview.superthoughts.com (invited listeners, before launch): the same site with the members gate on.
# Builds _site with the gate switched on, then puts the committed files back exactly as they were.
# Deploy after this with:  cd cloudflare && npx wrangler deploy --dry-run && npx wrangler deploy
set -e
cd "$(dirname "$0")/.."
tmp=$(mktemp -d)
for f in pilot-catalog.js index.html library.html about.html; do cp "$f" "$tmp/$f"; done
restore() { for f in pilot-catalog.js index.html library.html about.html; do cp "$tmp/$f" "$f"; done; rm -rf "$tmp"; }
trap restore EXIT
sed -i.bak 's/^ gate: false,/ gate: true,/' pilot-catalog.js && rm -f pilot-catalog.js.bak
grep -q '^ gate: true,' pilot-catalog.js
python3 scripts/build-shelves.py
python3 scripts/build-public.py
printf 'https://preview.superthoughts.com/*\n  X-Robots-Tag: noindex\n' > _site/_headers
# Workers assets cap a file at 25 MiB; those recordings stream from the CDN or the members app.
find _site -size +25M -print -delete
