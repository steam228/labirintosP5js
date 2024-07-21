let socket;
let messages = [];
let font;
let lastMessageTime = 0;
const inactivityThreshold = 1 * 60 * 1000; // 5 minutes in milliseconds
let isScreensaverMode = false;
let screensaverMessages = [];
let fontSize;
let lineHeight;
let leftMargin;

function preload() {
  font = loadFont("Acumin-BdPro.otf");
  console.log("Font loaded");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont(font);
  textAlign(LEFT, BOTTOM);

  fontSize = height * 0.05;
  lineHeight = fontSize * 1.5;
  leftMargin = width * 0.1;

  console.log(
    `Canvas size: ${width}x${height}, Font size: ${fontSize}, Line height: ${lineHeight}`
  );

  socket = new WebSocket("ws://steam228AI.local:8080");

  socket.onopen = () => {
    console.log("Connected to WebSocket server");
  };

  socket.onmessage = (event) => {
    console.log("Received message:", event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.type === "message") {
        addNewMessage(data.content);
      } else if (data.type === "new_poem") {
        enterScreensaverMode();
      }
    } catch (error) {
      console.error("Error parsing message:", error);
    }
  };

  socket.onerror = (error) => {
    console.error("WebSocket Error:", error);
  };

  socket.onclose = (event) => {
    console.log("WebSocket connection closed:", event.code, event.reason);
  };
}

function addNewMessage(message) {
  console.log(`Adding new message: ${message}`);
  if (isScreensaverMode) {
    exitScreensaverMode();
  }
  messages.push({ text: message, y: height, opacity: 0 });
  lastMessageTime = millis();

  // Only move messages up if there are 3 or more messages
  if (messages.length >= 3) {
    for (let i = 0; i < messages.length - 1; i++) {
      messages[i].y -= lineHeight;
    }
  }

  // Remove messages that have moved off the top of the screen
  messages = messages.filter((msg) => msg.y > -lineHeight);
  console.log(`Total messages: ${messages.length}`);
}

function draw() {
  background(255);

  if (isScreensaverMode) {
    drawScreensaver();
  } else {
    drawScrollingPoem();
  }

  // Check for inactivity
  if (!isScreensaverMode && millis() - lastMessageTime > inactivityThreshold) {
    enterScreensaverMode();
  }
}

function drawScrollingPoem() {
  console.log(`Drawing poem, messages: ${messages.length}`);
  textSize(fontSize);
  textStyle(BOLD);

  for (let msg of messages) {
    msg.opacity = min(msg.opacity + 5, 255);
    fill(0, msg.opacity);
    text(msg.text, leftMargin, msg.y);
    console.log(`Drawing message: "${msg.text}" at y=${msg.y}`);
  }
}

function enterScreensaverMode() {
  console.log("Entering screensaver mode");
  isScreensaverMode = true;
  screensaverMessages = messages.slice(-50).map((msg) => ({
    ...msg,
    x: random(width),
    y: random(height),
    vx: random(-0.5, 0.5),
    vy: random(-0.5, 0.5),
    rotation: random(TWO_PI),
    rotationSpeed: random(-0.02, 0.02),
  }));
  console.log(`Screensaver messages: ${screensaverMessages.length}`);
}

function exitScreensaverMode() {
  console.log("Exiting screensaver mode");
  isScreensaverMode = false;
  messages = []; // Clear the screen when exiting screensaver mode
}

function drawScreensaver() {
  textSize(fontSize);
  textStyle(BOLD);
  for (let msg of screensaverMessages) {
    push();
    translate(msg.x, msg.y);
    rotate(msg.rotation);
    fill(0, msg.opacity);
    text(msg.text, 0, 0);
    pop();

    // Update position
    msg.x += msg.vx;
    msg.y += msg.vy;

    // Wrap around screen edges
    msg.x = (msg.x + width) % width;
    msg.y = (msg.y + height) % height;

    // Update rotation
    msg.rotation += msg.rotationSpeed;

    // Randomly change velocity and rotation speed
    if (random() < 0.02) {
      msg.vx = random(-0.5, 0.5);
      msg.vy = random(-0.5, 0.5);
      msg.rotationSpeed = random(-0.02, 0.02);
    }
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  fontSize = height * 0.05;
  lineHeight = fontSize * 1.5;
  leftMargin = width * 0.1;
  console.log(
    `Window resized. New canvas size: ${width}x${height}, Font size: ${fontSize}, Line height: ${lineHeight}`
  );
}
