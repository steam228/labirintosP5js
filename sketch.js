// Coding Train / Daniel Shiffman
// adapted w/ml5 poseNET example to interactive text representation

const { VerletPhysics2D, VerletParticle2D, VerletSpring2D } = toxi.physics2d;
const { GravityBehavior } = toxi.physics2d.behaviors;
const { Vec2D, Rect } = toxi.geom;

let physics;

let particles = [];
let pointsType = [];

let springs = [];

let video;
let poseNet;
let pose;
let skeleton;

let mensagem = " Labirinto!";
let font;

// Variables for speech recognition
let recognition;
let isListening = false;

// Variables for smooth wrist tracking
let smoothLeftWrist = { x: 0, y: 0 };
let smoothRightWrist = { x: 0, y: 0 };
const smoothingFactor = 0.8; // Adjust this value between 0 and 1 (higher = smoother but more lag)

// Variables for wrist proximity speech recognition
const wristProximityThreshold = 200; // Adjust this value based on your needs
let isListeningFromProximity = false;
let lastListeningToggleTime = 0;
const listeningCooldown = 1000; // 1 second cooldown

function preload() {
  font = loadFont("Acumin-BdPro.otf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  physics = new VerletPhysics2D();

  let bounds = new Rect(0, 0, width, height);
  physics.setWorldBounds(bounds);

  particles.push(new Particle(width / 6, height / 4));
  particles.push(new Particle((5 * width) / 6, height / 4));
  particles.push(new Particle(width / 6, (3 * height) / 4));
  particles.push(new Particle((5 * width) / 6, (3 * height) / 4));

  for (let j = 0; j < 4; j++) {
    pointsType.push(new Particle((j * width) / 4, height / 2));
  }
  console.log(mensagem.length);

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      if (i !== j) {
        let a = particles[i];
        let b = particles[j];
        springs.push(new Spring(a, b, 0.001));
      }
    }
  }

  for (let particle of particles) {
    springs.push(new Spring(particle, pointsType[0], 0.01));
    springs.push(new Spring(particle, pointsType[1], 0.01));
    springs.push(new Spring(particle, pointsType[2], 0.01));
    springs.push(new Spring(particle, pointsType[3], 0.01));
  }

  springs.push(new Spring(particles[0], particles[2], 0.01));
  springs.push(new Spring(particles[1], particles[3], 0.01));

  video = createCapture(VIDEO);
  vw = width;
  vh = width * (1080 / 1920);
  video.size(vw, vh);
  video.hide();
  poseNet = ml5.poseNet(video, { flipHorizontal: true }, modelLoaded);
  poseNet.on("pose", gotPoses);

  textFont(font);
  textAlign(CENTER);

  // Initialize speech recognition
  if ("webkitSpeechRecognition" in window) {
    recognition = new webkitSpeechRecognition();
    recognition.lang = "pt-PT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = function (event) {
      let newMessage = event.results[0][0].transcript;
      console.log("New message:", newMessage);
      mensagem = " " + newMessage; // Add a leading space as in your original mensagem
      stopListening(); // Stop listening after receiving a result
      lastListeningToggleTime = millis(); // Update the last toggle time
    };

    recognition.onerror = function (event) {
      console.error("Speech recognition error:", event.error);
    };

    recognition.onend = function () {
      isListening = false;
      console.log("Speech recognition ended.");
    };
  } else {
    console.log("Speech recognition not supported");
  }
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;

    // Initialize smooth positions if they're zero
    if (smoothLeftWrist.x === 0 && smoothLeftWrist.y === 0) {
      smoothLeftWrist = { x: pose.leftWrist.x, y: pose.leftWrist.y };
    }
    if (smoothRightWrist.x === 0 && smoothRightWrist.y === 0) {
      smoothRightWrist = { x: pose.rightWrist.x, y: pose.rightWrist.y };
    }
  }
}

function modelLoaded() {
  console.log("poseNet ready");
}

function smoothPosition(current, target, factor) {
  return {
    x: current.x + (target.x - current.x) * factor,
    y: current.y + (target.y - current.y) * factor,
  };
}

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

function keyPressed() {
  if (key == " ") {
    startListening();
  }
}

function keyReleased() {
  if (key == " ") {
    stopListening();
  }
}

function draw() {
  background(255); // White background

  physics.update();

  noStroke();

  let x1 = pointsType[0].x,
    x2 = pointsType[1].x,
    x3 = pointsType[2].x,
    x4 = pointsType[3].x;
  let y1 = pointsType[0].y,
    y2 = pointsType[1].y,
    y3 = pointsType[2].y,
    y4 = pointsType[3].y;

  textSize(100);
  for (let i = 0; i <= mensagem.length; i++) {
    let steps = i / mensagem.length;
    let pointX = bezierPoint(x1, x2, x3, x4, steps);
    let pointY = bezierPoint(y1, y2, y3, y4, steps);
    if (steps > 0) {
      let currentChar = mensagem.charAt(i - 1);
      let LE = createVector(pointX, pointY);
      let LR = createVector(prevPointX, prevPointY);
      let normal = createVector(width / 2, 0);

      let dir = LE.sub(LR);
      dir.normalize();
      dir.mult(200);
      let angle = angleBetween(normal, dir);
      fill(0); // Black text
      noStroke();

      push();
      translate(pointX, pointY);
      rotate(angle);
      text(currentChar, 0, 0);
      pop();
    }

    prevPointX = pointX;
    prevPointY = pointY;
  }

  if (pose) {
    // Apply smoothing to wrist positions
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

    pointsType[0].lock();
    pointsType[0].x = smoothLeftWrist.x;
    pointsType[0].y = smoothLeftWrist.y;
    pointsType[0].unlock();
    pointsType[3].lock();
    pointsType[3].x = smoothRightWrist.x;
    pointsType[3].y = smoothRightWrist.y;
    pointsType[3].unlock();

    // Check wrist proximity and start/stop listening
    let wristDistance = dist(
      smoothLeftWrist.x,
      smoothLeftWrist.y,
      smoothRightWrist.x,
      smoothRightWrist.y
    );
    let currentTime = millis();

    if (currentTime - lastListeningToggleTime > listeningCooldown) {
      if (
        wristDistance < wristProximityThreshold &&
        !isListeningFromProximity
      ) {
        startListening();
        isListeningFromProximity = true;
        lastListeningToggleTime = currentTime;
      } else if (
        wristDistance >= wristProximityThreshold &&
        isListeningFromProximity
      ) {
        stopListening();
        isListeningFromProximity = false;
        lastListeningToggleTime = currentTime;
      }
    }
  }
}

function dot2(v, w) {
  let dot = v.x * w.x + v.y * w.y;
  return dot;
}

function angleBetween(v, w) {
  let dot = dot2(v, w);
  theta = acos(dot / (v.mag() * w.mag()));
  return theta;
}
