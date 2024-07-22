// particle.js
window.Particle = class extends toxi.physics2d.VerletParticle2D {
  constructor(x, y) {
    super(x, y);
    this.r = 2;
    window.physics.addParticle(this);
  }

  show() {
    fill(252, 238, 33);
    strokeWeight(1);
    circle(this.x, this.y, this.r * 12);

    strokeWeight(this.r * 4);
    point(this.x, this.y);
  }
};
