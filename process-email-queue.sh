#!/bin/bash

# Email queue processor - manually trigger email sending
# Usage:
#   EMAIL_QUEUE_PROCESSOR_SECRET=... ./process-email-queue.sh
# Optional overrides:
#   QUEUE_URL=https://novagross.com/api/email/process-queue?limit=10 ./process-email-queue.sh

set -euo pipefail

QUEUE_URL="${QUEUE_URL:-https://novagross.com/api/email/process-queue?limit=10}"

if [[ -z "${EMAIL_QUEUE_PROCESSOR_SECRET:-}" ]]; then
  echo "EMAIL_QUEUE_PROCESSOR_SECRET is not set."
  echo "Export it then re-run:"
  echo "  export EMAIL_QUEUE_PROCESSOR_SECRET=..."
  exit 1
fi

curl -sS -X POST "$QUEUE_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $EMAIL_QUEUE_PROCESSOR_SECRET"

echo ""
echo "✅ Email queue processed!"
