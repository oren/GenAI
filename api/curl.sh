#!/bin/sh

if [ "$#" -ne 2 ]; then
  echo "Error: Missing arguments. Exactly two arguments are required." >&2
  echo "Usage: $0 <URL> <Prompt>" >&2
  exit 1
fi

URL="$1"
PROMPT="$2"

curl -X POST \
  "${URL}" \
  -H "Content-Type: application/json" \
  -d "{
  \"prompt\": \"${PROMPT}\"
  }"
