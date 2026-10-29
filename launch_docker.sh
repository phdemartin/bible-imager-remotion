
#!/bin/bash

echo "Starting Bible Imager in Docker..."

# Check if docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed."
    exit 1
fi

# Stop and remove old container
docker rm -f bible-imager-remotion 2>/dev/null || true

# Build the image with new tag
# Exit if build fails
if ! docker build --no-cache --network=host -t bible-imager:remotion .; then
    echo "Docker build failed! Aborting deployment."
    exit 1
fi

# Run directly
echo "Starting Bible Imager (Remotion Edition)..."
docker run -d \
  --restart unless-stopped \
  --network host \
  --name bible-imager-remotion \
  --shm-size=1gb \
  --log-driver json-file \
  --log-opt max-size=10m \
  --log-opt max-file=3 \
  bible-imager:remotion

echo "App is running! Access it at http://localhost:3002"

echo "Application started! Access it at http://localhost:3002"
