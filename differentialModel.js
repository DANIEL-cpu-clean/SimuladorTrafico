class DifferentialModel {
  constructor({ maxAcceleration = 2.6, maxBrake = 7.5 } = {}) {
    this.maxAcceleration = maxAcceleration;
    this.maxBrake = maxBrake;
  }

  calculateAcceleration(vehicle, context) {
    // Modelo microscópico: cada vehiculo ajusta su aceleracion segun velocidad deseada,
    // distancia de seguridad, semaforos y zona de incidente.
    const desiredGap = vehicle.safeDistance + vehicle.length * 1.35 + vehicle.speed * 1.08;
    const leadGap = context.leadVehicle
      ? this.distanceAlongPath(vehicle, context.leadVehicle, context.pathLength)
      : Infinity;

    let acceleration = (vehicle.targetSpeed - vehicle.speed) * 0.55;

    if (leadGap < desiredGap) {
      const pressure = (desiredGap - leadGap) / Math.max(desiredGap, 1);
      acceleration -= this.maxBrake * (0.9 + pressure * 1.6);
    }

    if (leadGap < vehicle.length + 34) {
      acceleration -= this.maxBrake * 1.8;
    }

    if (context.redControlAhead && context.controlGap < desiredGap * 1.45) {
      const controlPressure = 1 - context.controlGap / (desiredGap * 1.45);
      acceleration -= this.maxBrake * controlPressure;
    }

    if (context.incidentAhead && context.incidentGap < 120) {
      acceleration -= 2.8 * (1 - context.incidentGap / 120);
    }

    return Math.max(-this.maxBrake, Math.min(this.maxAcceleration, acceleration));
  }

  integrate(vehicle, acceleration, dt, pathLength) {
    // Integracion numerica de las ecuaciones dx/dt = v y dv/dt = a.
    vehicle.acceleration = acceleration;
    vehicle.speed = Math.max(0, vehicle.speed + vehicle.acceleration * dt);
    vehicle.position += vehicle.speed * dt;

    if (vehicle.position > pathLength + 80) {
      vehicle.position = -80;
      vehicle.speed = vehicle.targetSpeed * 0.78;
    }
  }

  distanceAlongPath(vehicle, leadVehicle, pathLength) {
    let distance = leadVehicle.position - vehicle.position;
    if (distance <= 0) distance += pathLength;
    return distance;
  }
}

