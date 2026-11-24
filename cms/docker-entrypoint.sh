#!/bin/sh
# Generates Strapi secrets on first start and persists them in the data volume (/data),
# so restarts keep the same keys. Nothing secret is committed. Values already provided
# through the environment win over generated ones.
set -e
SECRETS_FILE="${SECRETS_FILE:-/data/secrets.env}"
mkdir -p "$(dirname "$SECRETS_FILE")"

gen() { node -e "console.log(require('crypto').randomBytes(16).toString('base64'))"; }

if [ ! -f "$SECRETS_FILE" ]; then
  {
    echo "GEN_APP_KEYS=$(gen),$(gen),$(gen),$(gen)"
    echo "GEN_API_TOKEN_SALT=$(gen)"
    echo "GEN_ADMIN_JWT_SECRET=$(gen)"
    echo "GEN_TRANSFER_TOKEN_SALT=$(gen)"
    echo "GEN_JWT_SECRET=$(gen)"
    echo "GEN_ENCRYPTION_KEY=$(gen)"
  } > "$SECRETS_FILE"
  chmod 600 "$SECRETS_FILE"
  echo "[entrypoint] generated new secrets in $SECRETS_FILE"
fi
. "$SECRETS_FILE"

export APP_KEYS="${APP_KEYS:-$GEN_APP_KEYS}"
export API_TOKEN_SALT="${API_TOKEN_SALT:-$GEN_API_TOKEN_SALT}"
export ADMIN_JWT_SECRET="${ADMIN_JWT_SECRET:-$GEN_ADMIN_JWT_SECRET}"
export TRANSFER_TOKEN_SALT="${TRANSFER_TOKEN_SALT:-$GEN_TRANSFER_TOKEN_SALT}"
export JWT_SECRET="${JWT_SECRET:-$GEN_JWT_SECRET}"
export ENCRYPTION_KEY="${ENCRYPTION_KEY:-$GEN_ENCRYPTION_KEY}"

exec "$@"
