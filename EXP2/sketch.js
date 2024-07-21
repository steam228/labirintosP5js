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
let recognition;
let isListening = false;
let smoothLeftWrist = { x: 0, y: 0 };
let smoothRightWrist = { x: 0, y: 0 };
const smoothingFactor = 0.8;
const wristProximityThreshold = 400;
let isListeningFromProximity = false;
let lastListeningToggleTime = 0;
const listeningCooldown = 1800;

function preload() {
  font = loadFont("Acumin-BdPro.otf");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  physics = new VerletPhysics2D();
  physics.setWorldBounds(new Rect(0, 0, width, height));

  initializeParticlesAndSprings();

  video = createCapture(VIDEO);
  let vw = width;
  let vh = width * (1080 / 1920);
  video.size(vw, vh);
  video.hide();
  poseNet = ml5.poseNet(video, { flipHorizontal: true }, modelLoaded);
  poseNet.on("pose", gotPoses);

  textFont(font);
  textAlign(CENTER);

  initializeSpeechRecognition();
}

function initializeParticlesAndSprings() {
  particles = [
    new Particle(width / 6, height / 4),
    new Particle((5 * width) / 6, height / 4),
    new Particle(width / 6, (3 * height) / 4),
    new Particle((5 * width) / 6, (3 * height) / 4),
  ];

  for (let j = 0; j < 4; j++) {
    pointsType.push(new Particle((j * width) / 4, height / 2));
  }

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      if (i !== j) springs.push(new Spring(particles[i], particles[j], 0.001));
    }
  }

  for (let particle of particles) {
    for (let point of pointsType) {
      springs.push(new Spring(particle, point, 0.01));
    }
  }

  springs.push(new Spring(particles[0], particles[2], 0.01));
  springs.push(new Spring(particles[1], particles[3], 0.01));
}

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

function handleSpeechResult(event) {
  let newMessage = event.results[0][0].transcript;
  console.log("New message:", newMessage);
  mensagem = " " + newMessage;
  stopListening();
  lastListeningToggleTime = millis();
}

function gotPoses(poses) {
  if (poses.length > 0) {
    pose = poses[0].pose;
    skeleton = poses[0].skeleton;
    updateSmoothWristPositions();
  }
}

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

function modelLoaded() {
  console.log("poseNet ready");
}

function smoothPosition(current, target, factor) {
  return {
    x: lerp(current.x, target.x, factor),
    y: lerp(current.y, target.y, factor),
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
  if (key == " ") startListening();
}

function keyReleased() {
  if (key == " ") stopListening();
}

function draw() {
  background(255);
  physics.update();

  updateWristPositions();
  checkWristProximity();
  drawText();
}

function updateWristPositions() {
  if (pose) {
    pointsType[0].lock();
    pointsType[0].x = smoothLeftWrist.x;
    pointsType[0].y = smoothLeftWrist.y;
    pointsType[0].unlock();
    pointsType[3].lock();
    pointsType[3].x = smoothRightWrist.x;
    pointsType[3].y = smoothRightWrist.y;
    pointsType[3].unlock();
  }
}

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
      let angle = calculateAngle(pointX, pointY, prevPointX, prevPointY);

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

function calculateAngle(x1, y1, x2, y2) {
  let v = createVector(x1 - x2, y1 - y2);
  let angle = v.heading();
  return angle;
}
