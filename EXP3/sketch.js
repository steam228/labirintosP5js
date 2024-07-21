// Import necessary modules from toxiclibs
const { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
const { GravityBehavior } = toxi.physics2d.behaviors;
const { Vec2D, Rect } = toxi.geom;

// Physics variables
let physics;
let particles = [];
let pointsType = [];
let springs = [];

// Video and pose detection variables
let video;
let poseNet;
let pose;
let skeleton;

// Text and font variables
let mensagem = " Labirinto!";
let font;

// Speech recognition variables
let recognition;
let isListening = false;

// Wrist position variables
let smoothLeftWrist = { x: 0, y: 0 };
let smoothRightWrist = { x: 0, y: 0 };
const smoothingFactor = 0.8;
const wristProximityThreshold = 400;
let isListeningFromProximity = false;
let lastListeningToggleTime = 0;
const listeningCooldown = 1800;

// File writing variables
let writer;
let fileCreated = false;

// Arm angle detection variables
const ARM_ANGLE_THRESHOLD = 5; // Adjusted based on your observation
let isArmStretched = false;
let armStretchBuffer = [];
const BUFFER_SIZE = 10;
const STRETCH_THRESHOLD = 0.7; // 70% of recent frames must show a stretch to activate
let lastWrittenMessage = "";

//debug?
let debug = true;

// Preload function to load the font
function preload() {
  font = loadFont("Acumin-BdPro.otf");
}

// Setup function to initialize the sketch
function setup() {
  createCanvas(windowWidth, windowHeight);
  physics = new VerletPhysics2D();
  physics.setWorldBounds(new Rect(0, 0, width, height));

  initializeParticlesAndSprings();
  setupVideo();
  setupTextAndSpeech();
}

// Initialize particles and springs for the physics simulation
function initializeParticlesAndSprings() {
  // Create corner particles
  particles = [
    new Particle(width / 6, height / 4),
    new Particle((5 * width) / 6, height / 4),
    new Particle(width / 6, (3 * height) / 4),
    new Particle((5 * width) / 6, (3 * height) / 4),
  ];

  // Create control points for text animation
  for (let j = 0; j < 4; j++) {
    pointsType.push(new Particle((j * width) / 4, height / 2));
  }

  // Create springs between particles
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      if (i !== j) springs.push(new Spring(particles[i], particles[j], 0.001));
    }
  }

  // Create springs between particles and control points
  for (let particle of particles) {
    for (let point of pointsType) {
      springs.push(new Spring(particle, point, 0.01));
    }
  }

  // Create diagonal springs
  springs.push(new Spring(particles[0], particles[2], 0.01));
  springs.push(new Spring(particles[1], particles[3], 0.01));
}

// Set up video capture and pose detection
function setupVideo() {
  video = createCapture(VIDEO);
  let vw = width;
  let vh = width * (1080 / 1920);
  video.size(vw, vh);
  video.hide();
  poseNet = ml5.poseNet(video, { flipHorizontal: true }, modelLoaded);
  poseNet.on("pose", gotPoses);
}

// Set up text and speech recognition
function setupTextAndSpeech() {
  textFont(font);
  textAlign(CENTER);
  initializeSpeechRecognition();
  writer = createWriter("poem_" + Date.now() + ".txt");

  for (let i = 0; i < BUFFER_SIZE; i++) {
    armStretchBuffer.push(false);
  }
}

// Initialize speech recognition
function initializeSpeechRecognition() {
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = handleSpeechResult;
    recognition.onerror = (event) =>
      console.error("Speech recognition error:", event.error);
    recognition.onend = () => {
      isListening = false;
      console.log("Speech recognition ended.");
    };
  } else {
    console.log("Speech recognition not supported");
  }
}

// Handle speech recognition results
function handleSpeechResult(event) {
  let newMessage = event.results[0][0].transcript;
  console.log("New message:", newMessage);
  mensagem = " " + newMessage;

  // Only write to file if the arm is stretched and the message is new
  if (isArmStretched && newMessage !== lastWrittenMessage) {
    appendToFile(newMessage);
    lastWrittenMessage = newMessage;
    console.log("Written to file:", newMessage);
  } else {
    console.log("Message not written to file");
  }

  stopListening();
  lastListeningToggleTime = millis();
}

// Handle received poses from PoseNet
function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
    updateSmoothWristPositions();
  }
}

// Update smoothed wrist positions
function updateSmoothWristPositions() {
  smoothLeftWrist = smoothPosition(
    smoothLeftWrist,
    pose.leftWrist,
    smoothingFactor
  );
  smoothRightWrist = smoothPosition(
    smoothRightWrist,
    pose.rightWrist,
    smoothingFactor
  );
}

// Callback function when PoseNet model is loaded
function modelLoaded() {
  console.log("poseNet ready");
}

// Smooth position calculation
function smoothPosition(current, target, factor) {
  if (!target) return current;
  let scaleX = width / video.width;
  let scaleY = height / video.height;
  return {
    x: lerp(current.x, target.x * scaleX, factor),
    y: lerp(current.y, target.y * scaleY, factor),
  };
}

// Start listening for speech
function startListening() {
  if (!isListening && recognition) {
    try {
      recognition.start();
      isListening = true;
      console.log("Started listening...");
    } catch (error) {
      console.error("Error starting recognition:", error);
    }
  }
}

// Stop listening for speech
function stopListening() {
  if (isListening && recognition) {
    try {
      recognition.stop();
      isListening = false;
      console.log("Stopped listening.");
    } catch (error) {
      console.error("Error stopping recognition:", error);
    }
  }
}

// Check if right arm is stretched
function isRightArmStretched() {
  if (pose && pose.rightShoulder && pose.rightElbow && pose.rightWrist) {
    let angle = calculateArmAngle(
      pose.rightShoulder,
      pose.rightElbow,
      pose.rightWrist
    );

    // Update buffer (check if angle is within the desired range)
    armStretchBuffer.push(angle >= -15 && angle <= 2);
    armStretchBuffer.shift();

    // Calculate percentage of true values in buffer
    let stretchPercentage =
      armStretchBuffer.filter(Boolean).length / BUFFER_SIZE;

    return stretchPercentage > STRETCH_THRESHOLD;
  }
  return false;
}

// Calculate arm angle
function calculateArmAngle(shoulder, elbow, wrist) {
  let upperArm = createVector(elbow.x - shoulder.x, elbow.y - shoulder.y);
  let forearm = createVector(wrist.x - elbow.x, wrist.y - elbow.y);

  // Calculate angle between upper arm and vertical line
  let angle = degrees(forearm.heading());

  // Adjust angle to match the observed range
  return angle;
}

// Append text to file
function appendToFile(text) {
  writer.write(text + "\n");
  writer.close();
  writer = createWriter("poem_" + Date.now() + ".txt");
  console.log("Appended to file: " + text);
}

// Handle key pressed events
function keyPressed() {
  if (key == " ") startListening();

  // Save and close the current file, then create a new one when 'N' is pressed
  if (key == "n" || key == "N") {
    writer.close();
    console.log("Current file saved and closed.");
    writer = createWriter("poem_" + Date.now() + ".txt");
    console.log("New file created.");
  }
  if (key == "d" || key == "D") {
    debug = !debug;
  }
}

// Handle key released events
function keyReleased() {
  if (key == " ") stopListening();
}

// Main draw loop
function draw() {
  background(255);
  physics.update();

  updateWristPositions();
  checkWristProximity();
  drawText();

  if (pose) {
    isArmStretched = isRightArmStretched();
    if (debug) {
      drawArmAngle();
      drawStretchIndicator();
    }
  }
}

// Update wrist positions for physics simulation
function updateWristPositions() {
  if (pose) {
    let scaleX = width / video.width;
    let scaleY = height / video.height;

    pointsType[0].lock();
    pointsType[0].x = smoothLeftWrist.x * scaleX;
    pointsType[0].y = smoothLeftWrist.y * scaleY;
    pointsType[0].unlock();
    pointsType[3].lock();
    pointsType[3].x = smoothRightWrist.x * scaleX;
    pointsType[3].y = smoothRightWrist.y * scaleY;
    pointsType[3].unlock();
  }
}

// Check wrist proximity for speech recognition trigger
function checkWristProximity() {
  if (pose && millis() - lastListeningToggleTime > listeningCooldown) {
    let wristDistance = dist(
      smoothLeftWrist.x,
      smoothLeftWrist.y,
      smoothRightWrist.x,
      smoothRightWrist.y
    );

    if (wristDistance < wristProximityThreshold && !isListeningFromProximity) {
      startListening();
      isListeningFromProximity = true;
      lastListeningToggleTime = millis();
    } else if (
      wristDistance >= wristProximityThreshold &&
      isListeningFromProximity
    ) {
      stopListening();
      isListeningFromProximity = false;
      lastListeningToggleTime = millis();
    }
  }
}

// Draw animated text
function drawText() {
  textSize(100);
  fill(0);
  noStroke();

  let x = pointsType.map((p) => p.x);
  let y = pointsType.map((p) => p.y);

  for (let i = 0; i <= mensagem.length; i++) {
    let steps = i / mensagem.length;
    let pointX = bezierPoint(x[0], x[1], x[2], x[3], steps);
    let pointY = bezierPoint(y[0], y[1], y[2], y[3], steps);

    if (steps > 0) {
      let currentChar = mensagem.charAt(i - 1);
      let angle = calculateTextAngle(pointX, pointY, prevPointX, prevPointY);

      push();
      translate(pointX, pointY);
      rotate(angle);
      text(currentChar, 0, 0);
      pop();
    }

    prevPointX = pointX;
    prevPointY = pointY;
  }
}

// Draw arm angle visualization
function drawArmAngle() {
  if (pose.rightShoulder && pose.rightElbow && pose.rightWrist) {
    let scaleX = width / video.width;
    let scaleY = height / video.height;

    // Draw arm lines
    stroke(255, 0, 0);
    strokeWeight(4);
    line(
      pose.rightShoulder.x * scaleX,
      pose.rightShoulder.y * scaleY,
      pose.rightElbow.x * scaleX,
      pose.rightElbow.y * scaleY
    );
    line(
      pose.rightElbow.x * scaleX,
      pose.rightElbow.y * scaleY,
      pose.rightWrist.x * scaleX,
      pose.rightWrist.y * scaleY
    );

    // Calculate and display angle
    let angle = calculateArmAngle(
      pose.rightShoulder,
      pose.rightElbow,
      pose.rightWrist
    );
    fill(255, 0, 0);
    noStroke();
    textSize(24);
    textAlign(CENTER, CENTER);
    text(
      `Angle: ${angle.toFixed(2)}°`,
      pose.rightElbow.x * scaleX,
      pose.rightElbow.y * scaleY - 30
    );

    // Draw a circle at the elbow to make it more visible
    fill(255, 0, 0);
    ellipse(pose.rightElbow.x * scaleX, pose.rightElbow.y * scaleY, 20, 20);
  }
}

// Draw stretch indicator
function drawStretchIndicator() {
  textAlign(LEFT, TOP);
  textSize(24);
  fill(isArmStretched ? color(0, 255, 0) : color(255, 0, 0));
  text(
    isArmStretched
      ? "ARM STRETCHED - WILL WRITE"
      : "ARM NOT STRETCHED - WON'T WRITE",
    10,
    10
  );
}

// Calculate angle for text rotation
function calculateTextAngle(x1, y1, x2, y2) {
  let v = createVector(x1 - x2, y1 - y2);
  let angle = v.heading();
  return angle;
}
