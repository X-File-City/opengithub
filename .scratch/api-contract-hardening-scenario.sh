#!/usr/bin/env bash
set -euo pipefail

echo "=== api-001 phase 5 final API contract hardening scenario ==="
if [[ -z "${TEST_DATABASE_URL:-${DATABASE_URL:-}}" ]]; then
  echo "Set TEST_DATABASE_URL or DATABASE_URL to run the live Postgres scenario." >&2
  exit 1
fi

cargo test --test api_contract_hardening -- --nocapture
