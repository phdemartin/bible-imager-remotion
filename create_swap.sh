#!/bin/bash

echo "Checking swap..."
if grep -q "swapfile" /proc/swaps; then
    echo "Swap file already exists."
    free -h
    exit 0
fi

echo "Creating 2G swap file..."
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

echo "Swap created!"
free -h
