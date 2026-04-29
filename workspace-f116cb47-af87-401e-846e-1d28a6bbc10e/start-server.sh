#!/bin/bash
while true; do
  NODE_OPTIONS="--max-old-space-size=512" npx next dev -p 3000 2>&1
  echo "Server died, restarting in 2s..."
  sleep 2
done
