# Labirintos Interactive Installation

This project consists of an interactive installation using WebSockets to communicate between a main display (`LabirintosFinal`), a wall display (`labirintosWall`), and a server (`labirintosServer.js`).

## Project Structure

- `LabirintosFinal/`: Main interactive display
- `labirintosWall/`: Wall display for accumulated text
- `labirintosServer.js`: WebSocket server
- `package.json`: Node.js project file

## Server Setup (DigitalOcean)

### 1. Create a Droplet

1. Log in to your DigitalOcean account.
2. Create a new Droplet with Ubuntu (latest LTS version).
3. Choose the Basic plan with the cheapest option.
4. Select a datacenter region close to your target audience.
5. Choose SSH keys or password for authentication.
6. Create the Droplet.

### 2. Connect to Your Droplet

```bash
ssh root@your_droplet_ip
```

### 3. Update and Install Dependencies

```bash
sudo apt update && sudo apt upgrade -y
curl -fsSL https://deb.nodesource.com/setup_14.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo apt install git
```

### 4. Clone and Set Up the Project

```bash
git clone https://your-repository-url.git
cd your-project-directory
npm install
```

### 5. Set Up SSL for Secure WebSocket (WSS)

Generate a self-signed certificate:

```bash
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/selfsigned.key -out /etc/ssl/certs/selfsigned.crt
```

When prompted, use your server's IP address for the "Common Name" field.

### 6. Modify labirintosServer.js

Update `labirintosServer.js` to use HTTPS and WSS:

```javascript
const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const options = {
  cert: fs.readFileSync('/etc/ssl/certs/selfsigned.crt'),
  key: fs.readFileSync('/etc/ssl/private/selfsigned.key')
};

const server = https.createServer(options, (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.end();
});

const wss = new WebSocket.Server({ server });

// ... rest of your server code ...

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`Secure WebSocket server is running on port ${port}`);
  
  // ... rest of your server startup code ...
});
```

### 7. Set Up Process Management with PM2

```bash
sudo npm install pm2 -g
pm2 start labirintosServer.js
pm2 startup systemd
pm2 save
```

### 8. Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 8080/tcp
sudo ufw enable
```

## Client-Side Changes (p5.js sketches)

Update both `LabirintosFinal/sketch.js` and `labirintosWall/sketch.js` to use secure WebSocket:

```javascript
socket = new WebSocket('wss://your_droplet_ip:8080');
```

Replace `your_droplet_ip` with your DigitalOcean Droplet's IP address.

## Running the Installation

1. Ensure the server is running on your DigitalOcean Droplet.
2. Open `LabirintosFinal/index.html` on the main display device.
3. Open `labirintosWall/index.html` on the wall display device.

## Troubleshooting

- If you encounter security warnings in the browser, you may need to manually accept the risk due to the self-signed certificate.
- For testing, you might need to lower your browser's security settings or use a tool like Postman that allows ignoring SSL certificate errors.
- To view server logs: `pm2 logs labirintosServer`

## Future Improvements

- Replace the self-signed certificate with a trusted SSL certificate (e.g., Let's Encrypt) for better security and browser compatibility.
- Set up a domain name for your server for easier management and security.

## Note on Security

The current setup uses a self-signed certificate, which is suitable for testing but not recommended for production. For a public-facing installation, consider using a domain name and obtaining a certificate from a trusted authority like Let's Encrypt.

