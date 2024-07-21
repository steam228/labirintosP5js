const WebSocket = require('ws');
const http = require('http');
const fs = require('fs');
const path = require('path');

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.end();
});

const wss = new WebSocket.Server({ server });

let currentPoem = [];
let lastMessageTime = Date.now();
const inactivityThreshold = 5 * 60 * 1000; // 5 minutes in milliseconds

function checkInactivity() {
  if (Date.now() - lastMessageTime > inactivityThreshold) {
    if (currentPoem.length > 0) {
      savePoem();
      currentPoem = [];
      broadcastNewPoem();
    }
  }
}

function savePoem() {
  const filename = `poem_${Date.now()}.txt`;
  const content = currentPoem.join('\n');
  fs.writeFileSync(path.join(__dirname, 'poems', filename), content);
  console.log(`Poem saved: ${filename}`);
}

function broadcastNewPoem() {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'new_poem' }));
    }
  });
}

setInterval(checkInactivity, 60000); // Check every minute

wss.on('connection', (ws) => {
  console.log('New client connected');

  ws.on('message', (message) => {
    console.log('Received:', message);
    try {
      const data = JSON.parse(message);
      
      if (data.type === 'message') {
        console.log('Received message:', data.content);
        currentPoem.push(data.content);
        lastMessageTime = Date.now();
        
        // Broadcast the message to all connected clients
        wss.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'image') {
        console.log('Received image data');
        
        // Save the image
        const imageBuffer = Buffer.from(data.content, 'base64');
        const filename = `image_${Date.now()}.png`;
        fs.writeFile(path.join(__dirname, 'images', filename), imageBuffer, (err) => {
          if (err) {
            console.error('Error saving image:', err);
          } else {
            console.log('Image saved:', filename);
          }
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const port = process.env.PORT || 8080;
server.listen(port, () => {
  console.log(`WebSocket server is running on port ${port}`);
  
  // Create 'images' and 'poems' directories if they don't exist
  const imagesDir = path.join(__dirname, 'images');
  const poemsDir = path.join(__dirname, 'poems');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
  }
  if (!fs.existsSync(poemsDir)) {
    fs.mkdirSync(poemsDir);
  }
});
