#!/bin/sh

curl -X POST \
  https://xv7sjhw21m.execute-api.us-west-2.amazonaws.com/chat \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "Hello, who are you and what can you do?"
  }'
