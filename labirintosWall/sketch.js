//Labirintos Wall - in another wall a poem will be formed from the interaction of with the main. With no interaction it will form a screensaver animation with the words.

let socket;
let messages = [];
let font;
const maxMessages = 50; // Maximum number of messages to display

function preload() {
<<<<<<< HEAD
<<<<<<< HEAD
  font = loadFont("./Acumin-BdPro.otf");
=======
  font = loadFont("Acumin-BdPro.otf");
>>>>>>> parent of 230e238 (wall update)
  console.log("Font loaded");
=======
  font = loadFont("path/to/your/font.otf"); // Replace with the path to your font file
>>>>>>> parent of 5039949 (wall update2)
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textSize(24);
  textAlign(LEFT, TOP);

<<<<<<< HEAD
<<<<<<< HEAD
  fontSize = height * 0.06; // Increased from 0.05 to 0.06 (20% increase)
=======
  fontSize = height * 0.05;
>>>>>>> parent of 230e238 (wall update)
  lineHeight = fontSize * 1.5;
  leftMargin = width * 0.1;

  console.log(
    `Canvas size: ${width}x${height}, Font size: ${fontSize}, Line height: ${lineHeight}`
  );
=======
  setupWebSocket();
}
>>>>>>> parent of 5039949 (wall update2)

function setupWebSocket() {
  socket = new WebSocket("wss://206.189.10.46:8080");

  socket.onopen = () => {
    console.log("Connected to WebSocket server");
  };

  socket.onmessage = (event) => {
    console.log("Received message:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        addMessage(data.content);
      } else if (data.type === "new_poem") {
        // Clear messages when a new poem starts
        messages = [];
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };

  socket.onclose = (event) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
    // Attempt to reconnect after a delay
    setTimeout(setupWebSocket, 5000);
  };
}

function addMessage(message) {
  messages.push(message);
  if (messages.length > maxMessages) {
    messages.shift(); // Remove the oldest message if we exceed the maximum
  }
}

function draw() {
  background(255);
  fill(0);

  let y = 10;
  for (let msg of messages) {
    text(msg, 10, y);
    y += 30; // Adjust this value to change the spacing between messages
    if (y > height) break; // Stop drawing if we've reached the bottom of the canvas
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
