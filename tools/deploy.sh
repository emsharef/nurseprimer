#!/bin/sh
# Build the book for sharef.net/nurseprimer and upload it (static files; DreamHost, over SSH).
# Runs every check first: a deploy never ships a page that fails the audit or the a11y lint.
# Usage: npm run deploy
set -e
cd "$(dirname "$0")/.."
npm run audit:citations
npm run audit:content
npm test
# Build into its own folder so the local apps/site/dist (served by tests and playtests) keeps base "/".
rm -rf dist-deploy
BASE_PATH=/nurseprimer/ ASTRO_TELEMETRY_DISABLED=1 npm run build -w apps/site -- --outDir ../../dist-deploy
cp tools/deploy/htaccess dist-deploy/.htaccess
node scripts/version-check.mjs dist-deploy
rsync -az --delete --stats --exclude api-data/ dist-deploy/ esharef@sharef.net:sharef.net/nurseprimer/ | grep -E "Number of (regular )?files transferred|Total transferred"
echo "deployed: https://sharef.net/nurseprimer/"
