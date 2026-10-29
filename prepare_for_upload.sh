#!/bin/bash

# Define the output filename
OUTPUT_FILE="bible-imager-deploy.zip"

echo "Preparing deployment package..."

# Remove old zip if exists
rm -f $OUTPUT_FILE

# Zip the necessary files
# We exclude node_modules, .next, and .git to keep it small
# We MUST include Dockerfile, src, public, and config files
zip -r $OUTPUT_FILE \
  Dockerfile \
  package.json \
  package-lock.json \
  next.config.mjs \
  tsconfig.json \
  postcss.config.js \
  tailwind.config.ts \
  launch_docker.sh \
  docker-compose.yml \
  src \
  public \
  -x "**/node_modules/*" \
  -x "**/.next/*" \
  -x "**/.git/*"

echo "-----------------------------------"
echo "Success! Created $OUTPUT_FILE"
echo "-----------------------------------"
echo "Next steps:"
echo "1. Upload this file to your server (e.g. via scp or FileZilla)"
echo "2. SSH into your server"
echo "3. Unzip it: unzip $OUTPUT_FILE"
echo "4. Run: ./launch_docker.sh"
echo "-----------------------------------"
