class Vehicle {
  constructor({ id, lane, direction, position, speed, targetSpeed, color }) {
    this.id = id;
    this.lane = lane;
    this.direction = direction;
    this.position = position;
    this.speed = speed;
    this.targetSpeed = targetSpeed;
    this.baseTargetSpeed = targetSpeed;
    this.color = color;
    this.acceleration = 0;
    this.safeDistance = 28 + Math.random() * 18;
    this.length = 24 + Math.random() * 12;
    this.width = 13;
    this.type = Math.random() > 0.84 ? "bus" : "car";
    if (this.type === "bus") {
      this.length += 16;
      this.width += 3;
      this.safeDistance += 12;
    }
  }

  update(dt, traffic, model) {
    // El vehiculo recibe el contexto de su carril y el modelo diferencial calcula su movimiento.
    const context = traffic.getVehicleContext(this);
    const acceleration = model.calculateAcceleration(this, context);
    model.integrate(this, acceleration, dt, traffic.pathLength);
  }

  draw(ctx, point, angle) {
    ctx.save();
    ctx.translate(point.x, point.y);
    ctx.rotate(angle);
    ctx.fillStyle = this.color;
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1;
    roundRect(ctx, -this.length / 2, -this.width / 2, this.length, this.width, 4);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    roundRect(ctx, -this.length * 0.16, -this.width * 0.36, this.length * 0.28, this.width * 0.72, 3);
    ctx.fill();

    ctx.fillStyle = "rgba(10, 14, 18, 0.5)";
    ctx.fillRect(-this.length * 0.36, -this.width * 0.52, 5, 2);
    ctx.fillRect(this.length * 0.26, -this.width * 0.52, 5, 2);
    ctx.restore();
  }
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
