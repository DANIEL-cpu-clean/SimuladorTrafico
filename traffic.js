class TrafficSimulation {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.model = new DifferentialModel();
    this.vehicles = [];
    this.lights = [
      new TrafficLight({ id: "LP-control", pathPosition: 340, label: "Control La Paz" }),
      new TrafficLight({ id: "EA-control", pathPosition: 910, label: "Control El Alto" })
    ];
    this.pathLength = 1180;
    this.spawnRate = 0.9;
    this.targetSpeedKmh = 70;
    this.smartMode = false;
    this.incidentMode = false;
    this.scenario = "Trafico normal";
    this.spawnClock = 0;
    this.vehicleId = 0;
    this.lastStats = null;
    this.resize();
    window.addEventListener("resize", () => this.resize());
    this.setScenario("normal");
  }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(900, Math.floor(rect.width * ratio));
    this.canvas.height = Math.max(520, Math.floor(rect.height * ratio));
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    this.width = this.canvas.width / ratio;
    this.height = this.canvas.height / ratio;
  }

  setScenario(type) {
    this.incidentMode = type === "accident";
    this.smartMode = type === "smart";
    if (type === "normal") {
      this.scenario = "Trafico normal";
      this.spawnRate = 0.85;
      this.targetSpeedKmh = 70;
      this.seedVehicles(30);
    }
    if (type === "rush") {
      this.scenario = "Hora pico";
      this.spawnRate = 1.75;
      this.targetSpeedKmh = 56;
      this.seedVehicles(66);
    }
    if (type === "accident") {
      this.scenario = "Accidente en autopista";
      this.spawnRate = 1.25;
      this.targetSpeedKmh = 54;
      this.seedVehicles(54);
    }
    if (type === "smart") {
      this.scenario = "Modo inteligente";
      this.spawnRate = 1.35;
      this.targetSpeedKmh = 66;
      this.seedVehicles(54);
    }
  }

  seedVehicles(count) {
    this.vehicles = [];
    const lanes = [];
    [-1, 1].forEach(direction => {
      for (let lane = 0; lane < 3; lane++) lanes.push({ direction, lane });
    });

    const vehiclesPerLane = Math.ceil(count / lanes.length);
    lanes.forEach(({ direction, lane }, laneIndex) => {
      const spacing = this.pathLength / vehiclesPerLane;
      for (let i = 0; i < vehiclesPerLane && this.vehicles.length < count; i++) {
        const stagger = (laneIndex % 3) * 18 + Math.random() * 16;
        const position = (i * spacing + stagger) % this.pathLength;
        this.addVehicle(position, lane, direction, true);
      }
    });
  }

  getSafeSpawnPosition(lane, direction, preferredPosition = -60) {
    const minimumGap = 82;
    for (let attempt = 0; attempt < 18; attempt++) {
      const candidate = attempt === 0
        ? preferredPosition
        : (preferredPosition + attempt * 96 + Math.random() * 32) % this.pathLength;
      const blocked = this.vehicles.some(vehicle => {
        if (vehicle.lane !== lane || vehicle.direction !== direction) return false;
        const rawDistance = Math.abs(vehicle.position - candidate);
        const distance = Math.min(rawDistance, this.pathLength - rawDistance);
        return distance < minimumGap;
      });
      if (!blocked) return candidate;
    }
    return (preferredPosition + Math.random() * this.pathLength) % this.pathLength;
  }

  addVehicle(position = -60, forcedLane = null, forcedDirection = null, skipGapCheck = false) {
    const direction = forcedDirection ?? (Math.random() > 0.5 ? 1 : -1);
    const lane = forcedLane ?? Math.floor(Math.random() * 3);
    const safePosition = skipGapCheck ? position : this.getSafeSpawnPosition(lane, direction, position);
    const speed = this.kmhToModel(this.targetSpeedKmh * (0.66 + Math.random() * 0.28));
    const palette = ["#38d6e8", "#43d37b", "#f7c948", "#ff8f5d", "#6ea8ff", "#e7edf2"];
    this.vehicles.push(new Vehicle({
      id: this.vehicleId++,
      lane,
      direction,
      position: safePosition,
      speed,
      targetSpeed: this.kmhToModel(this.targetSpeedKmh * (0.88 + Math.random() * 0.18)),
      color: palette[Math.floor(Math.random() * palette.length)]
    }));
  }

  update(dt) {
    // Paso principal de simulacion: entradas, semaforos, vehiculos y estadisticas.
    this.spawnClock += dt * this.spawnRate;
    if (this.spawnClock > 1) {
      this.spawnClock = 0;
      if (this.vehicles.length < 130) this.addVehicle(-70);
    }

    const stats = this.calculateStats();
    this.lights.forEach(light => light.update(dt, stats.density, this.smartMode));
    this.vehicles.forEach(vehicle => {
      vehicle.targetSpeed = this.kmhToModel(this.targetSpeedKmh) * (vehicle.baseTargetSpeed / this.kmhToModel(70));
      vehicle.update(dt, this, this.model);
    });
    this.lastStats = this.calculateStats();
  }

  getVehicleContext(vehicle) {
    // Busca el vehiculo delantero y restricciones proximas para crear frenado y filas.
    const sameLane = this.vehicles
      .filter(other => other !== vehicle && other.lane === vehicle.lane && other.direction === vehicle.direction)
      .sort((a, b) => this.forwardDistance(vehicle, a) - this.forwardDistance(vehicle, b));

    const leadVehicle = sameLane[0] || null;
    const light = this.lights.find(item => {
      const gap = this.forwardPositionGap(vehicle.position, item.pathPosition);
      return gap > 0 && gap < 150;
    });

    const incidentStart = 690;
    const incidentGap = this.forwardPositionGap(vehicle.position, incidentStart);

    return {
      leadVehicle,
      pathLength: this.pathLength,
      redControlAhead: Boolean(light && light.isBlocking()),
      controlGap: light ? this.forwardPositionGap(vehicle.position, light.pathPosition) : Infinity,
      incidentAhead: this.incidentMode && incidentGap > 0,
      incidentGap
    };
  }

  forwardDistance(vehicle, other) {
    return this.forwardPositionGap(vehicle.position, other.position);
  }

  forwardPositionGap(from, to) {
    let gap = to - from;
    if (gap <= 0) gap += this.pathLength;
    return gap;
  }

  draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawCityTerrain(ctx);
    this.drawRoad(ctx);
    this.drawControls(ctx);
    this.drawVehicles(ctx);
    this.drawOverlayLabels(ctx);
  }

  drawCityTerrain(ctx) {
    const gradient = ctx.createLinearGradient(0, 0, this.width, this.height);
    gradient.addColorStop(0, "#172330");
    gradient.addColorStop(0.48, "#101820");
    gradient.addColorStop(1, "#1d2630");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    for (let x = 40; x < this.width; x += 80) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x - 80, this.height);
      ctx.stroke();
    }

    ctx.fillStyle = "rgba(76, 91, 105, 0.28)";
    for (let i = 0; i < 22; i++) {
      const x = (i * 137) % this.width;
      const y = 28 + ((i * 79) % (this.height - 90));
      ctx.fillRect(x, y, 28 + (i % 4) * 11, 16 + (i % 3) * 9);
    }
  }

  drawRoad(ctx) {
    const top = this.getRoadY(-1) - 58;
    const bottom = this.getRoadY(1) + 58;

    ctx.save();
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#242d36";
    ctx.lineWidth = 186;
    this.drawBasePath(ctx);
    ctx.stroke();

    ctx.strokeStyle = "#303943";
    ctx.lineWidth = 168;
    this.drawBasePath(ctx);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.22)";
    ctx.lineWidth = 2;
    this.drawBasePath(ctx, -84);
    ctx.stroke();
    this.drawBasePath(ctx, 84);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.58)";
    ctx.setLineDash([18, 18]);
    ctx.lineWidth = 2;
    [-56, -28, 28, 56].forEach(offset => {
      this.drawBasePath(ctx, offset);
      ctx.stroke();
    });
    ctx.setLineDash([]);

    ctx.strokeStyle = "#a8b0b8";
    ctx.lineWidth = 10;
    this.drawBasePath(ctx, 0);
    ctx.stroke();
    ctx.strokeStyle = "#f7c948";
    ctx.lineWidth = 2;
    this.drawBasePath(ctx, 0);
    ctx.stroke();
    ctx.restore();

    this.drawRamps(ctx, top, bottom);
    this.drawCongestionZone(ctx);
  }

  drawBasePath(ctx, offset = 0) {
    const h = this.height;
    ctx.beginPath();
    ctx.moveTo(40, h * 0.63 + offset);
    ctx.bezierCurveTo(this.width * 0.24, h * 0.45 + offset, this.width * 0.36, h * 0.39 + offset, this.width * 0.48, h * 0.48 + offset);
    ctx.bezierCurveTo(this.width * 0.63, h * 0.59 + offset, this.width * 0.78, h * 0.38 + offset, this.width - 50, h * 0.28 + offset);
  }

  drawRamps(ctx, top, bottom) {
    ctx.save();
    ctx.strokeStyle = "#2f3943";
    ctx.lineWidth = 32;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(this.width * 0.22, bottom + 80);
    ctx.quadraticCurveTo(this.width * 0.27, bottom + 18, this.width * 0.34, bottom - 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.width * 0.76, top - 80);
    ctx.quadraticCurveTo(this.width * 0.7, top - 15, this.width * 0.63, top + 20);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255,255,255,0.52)";
    ctx.lineWidth = 2;
    ctx.setLineDash([14, 12]);
    ctx.beginPath();
    ctx.moveTo(this.width * 0.22, bottom + 80);
    ctx.quadraticCurveTo(this.width * 0.27, bottom + 18, this.width * 0.34, bottom - 28);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.width * 0.76, top - 80);
    ctx.quadraticCurveTo(this.width * 0.7, top - 15, this.width * 0.63, top + 20);
    ctx.stroke();
    ctx.restore();
  }

  drawCongestionZone(ctx) {
    const zonePoint = this.getPointOnPath(700, 0);
    ctx.save();
    ctx.fillStyle = this.incidentMode ? "rgba(255, 93, 93, 0.28)" : "rgba(247, 201, 72, 0.18)";
    ctx.strokeStyle = this.incidentMode ? "#ff5d5d" : "#f7c948";
    ctx.lineWidth = 2;
    roundRect(ctx, zonePoint.x - 80, zonePoint.y - 120, 170, 220, 8);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawControls(ctx) {
    this.lights.forEach(light => {
      const point = this.getPointOnPath(light.pathPosition, 103);
      ctx.save();
      ctx.fillStyle = "#0a0f14";
      roundRect(ctx, point.x - 18, point.y - 42, 36, 84, 8);
      ctx.fill();
      ["red", "yellow", "green"].forEach((state, index) => {
        ctx.beginPath();
        ctx.fillStyle = light.state === state ? light.getColor() : "rgba(255,255,255,0.16)";
        ctx.arc(point.x, point.y - 24 + index * 24, 7, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.fillStyle = "#edf4f8";
      ctx.font = "12px Segoe UI";
      ctx.textAlign = "center";
      ctx.fillText(light.label, point.x, point.y + 58);
      ctx.restore();
    });
  }

  drawVehicles(ctx) {
    this.vehicles.forEach(vehicle => {
      const laneOffset = vehicle.direction === 1
        ? 22 + vehicle.lane * 28
        : -22 - vehicle.lane * 28;
      const point = this.getPointOnPath(vehicle.position, laneOffset);
      const angle = this.getPathAngle(vehicle.position) + (vehicle.direction === 1 ? 0 : Math.PI);
      vehicle.draw(ctx, point, angle);
    });
  }

  drawOverlayLabels(ctx) {
    ctx.save();
    ctx.font = "700 13px Segoe UI";
    ctx.fillStyle = "rgba(237,244,248,0.9)";
    ctx.fillText("La Paz", 48, this.height * 0.73);
    ctx.fillText("El Alto", this.width - 100, this.height * 0.19);
    ctx.fillStyle = this.incidentMode ? "#ffb0b0" : "#ffe58d";
    ctx.fillText(this.incidentMode ? "Incidente activo" : "Zona de congestion", this.width * 0.56, this.height * 0.37);
    ctx.restore();
  }

  getPointOnPath(position, laneOffset = 0) {
    const t = Math.max(0, Math.min(1, position / this.pathLength));
    const p0 = { x: 40, y: this.height * 0.63 };
    const p1 = { x: this.width * 0.24, y: this.height * 0.45 };
    const p2 = { x: this.width * 0.36, y: this.height * 0.39 };
    const p3 = { x: this.width * 0.48, y: this.height * 0.48 };
    const p4 = { x: this.width * 0.63, y: this.height * 0.59 };
    const p5 = { x: this.width * 0.78, y: this.height * 0.38 };
    const p6 = { x: this.width - 50, y: this.height * 0.28 };
    const first = t < 0.5;
    const localT = first ? t / 0.5 : (t - 0.5) / 0.5;
    const a = first ? bezier(p0, p1, p2, p3, localT) : bezier(p3, p4, p5, p6, localT);
    const d = first ? bezierDerivative(p0, p1, p2, p3, localT) : bezierDerivative(p3, p4, p5, p6, localT);
    const length = Math.hypot(d.x, d.y) || 1;
    return {
      x: a.x + (-d.y / length) * laneOffset,
      y: a.y + (d.x / length) * laneOffset
    };
  }

  getRoadY(direction) {
    return this.height * 0.48 + direction * 82;
  }

  getPathAngle(position) {
    const delta = 4;
    const a = this.getPointOnPath(Math.max(0, position - delta), 0);
    const b = this.getPointOnPath(Math.min(this.pathLength, position + delta), 0);
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  calculateStats() {
    // Densidad y flujo: rho = N / L, q = rho * v promedio.
    const count = this.vehicles.length;
    const avgModelSpeed = count
      ? this.vehicles.reduce((sum, vehicle) => sum + vehicle.speed, 0) / count
      : 0;
    const averageSpeed = this.modelToKmh(avgModelSpeed);
    const roadLengthKm = 8.9;
    const density = count / roadLengthKm;
    const flow = density * averageSpeed;
    const slowVehicles = this.vehicles.filter(vehicle => this.modelToKmh(vehicle.speed) < 24).length;
    const congestion = count ? Math.min(100, (slowVehicles / count) * 100 + density * 1.4) : 0;
    return { count, averageSpeed, density, flow, congestion };
  }

  kmhToModel(kmh) {
    return kmh / 3.6;
  }

  modelToKmh(value) {
    return value * 3.6;
  }
}

function bezier(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: u ** 3 * p0.x + 3 * u ** 2 * t * p1.x + 3 * u * t ** 2 * p2.x + t ** 3 * p3.x,
    y: u ** 3 * p0.y + 3 * u ** 2 * t * p1.y + 3 * u * t ** 2 * p2.y + t ** 3 * p3.y
  };
}

function bezierDerivative(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return {
    x: 3 * u ** 2 * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t ** 2 * (p3.x - p2.x),
    y: 3 * u ** 2 * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t ** 2 * (p3.y - p2.y)
  };
}


