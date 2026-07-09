class TrafficLight {
  constructor({ id, pathPosition, label }) {
    this.id = id;
    this.pathPosition = pathPosition;
    this.label = label;
    this.state = "green";
    this.timer = 0;
    this.greenTime = 9;
    this.yellowTime = 2.5;
    this.redTime = 7;
  }

  update(dt, densityNearLight, smartMode) {
    this.timer += dt;

    // En modo inteligente se amplian los verdes cuando la densidad sube.
    if (smartMode) {
      this.greenTime = densityNearLight > 18 ? 14 : 8;
      this.redTime = densityNearLight > 18 ? 4.5 : 7;
    } else {
      this.greenTime = 9;
      this.redTime = 7;
    }

    const limit = this.state === "green"
      ? this.greenTime
      : this.state === "yellow"
        ? this.yellowTime
        : this.redTime;

    if (this.timer >= limit) {
      this.timer = 0;
      this.state = this.state === "green" ? "yellow" : this.state === "yellow" ? "red" : "green";
    }
  }

  isBlocking() {
    return this.state === "red" || this.state === "yellow";
  }

  getColor() {
    if (this.state === "green") return "#43d37b";
    if (this.state === "yellow") return "#f7c948";
    return "#ff5d5d";
  }
}
