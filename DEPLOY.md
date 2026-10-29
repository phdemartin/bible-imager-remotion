# Bible Imager - Server Deployment Guide

## 1. Upload
Upload `bible-imager-deploy.zip` to your server using SCP or an FTP client (like FileZilla).

## 2. Install (One-time setup)
If you haven't already, install Docker on your server:
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y docker.io unzip
```

## 3. Deploy
SSH into your server and run these commands:

```bash
# 1. Unzip the package
unzip -o bible-imager-deploy.zip -d bible-imager

# 2. Go into the directory
cd bible-imager

# 3. Make the launch script executable
chmod +x launch_docker.sh

# 4. Start the application (This stops the old one, rebuilds, and runs the new one)
./launch_docker.sh
```

## 4. Verify
Your app should now be running on port 3000.
Access it at: `http://YOUR_SERVER_IP:3000`

## Troubleshooting
View logs with:
```bash
docker logs -f bible-imager
```
