# Setting Up Your Node.js WebSocket Server on DigitalOcean

This guide will walk you through setting up your Node.js WebSocket server on DigitalOcean's most cost-effective option.

## 1. Create a Droplet

1. Log in to your DigitalOcean account.
2. Click "Create" and select "Droplets".
3. Choose Ubuntu (latest LTS version) as the image.
4. Select the "Basic" plan with the cheapest option ($4/month, 1GB RAM / 1 CPU).
5. Choose a datacenter region closest to your target audience.
6. Select SSH keys or password for authentication.
7. Give your Droplet a hostname (e.g., "node-websocket-server").
8. Click "Create Droplet".

## 2. Connect to Your Droplet

1. Note down your Droplet's IP address.
2. Connect via SSH: `ssh root@your_droplet_ip`

## 3. Set Up the Environment

1. Update your system:
   ```
   sudo apt update && sudo apt upgrade -y
   ```

2. Install Node.js and npm:
   ```
   curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```

3. Install Git:
   ```
   sudo apt install git
   ```

## 4. Deploy Your Application

1. Clone your repository or create a new directory.
2. Navigate to your project directory.
3. Install dependencies:
   ```
   npm install
   ```

## 5. Set Up Process Management

1. Install PM2:
   ```
   sudo npm install pm2 -g
   ```

2. Start your application:
   ```
   pm2 start server.js
   ```

3. Set up PM2 to start on system reboot:
   ```
   pm2 startup systemd
   ```
   Follow the provided instructions.

4. Save the PM2 process list:
   ```
   pm2 save
   ```

## 6. Configure Firewall (Optional)

1. Set up a basic firewall:
   ```
   sudo ufw allow OpenSSH
   sudo ufw allow 8080/tcp  # or your app's port
   sudo ufw enable
   ```

## 7. Update Client-Side Code

Update your client-side code to use the new IP address or domain name of your DigitalOcean Droplet.

Remember to monitor your usage and upgrade if necessary as your application grows.

