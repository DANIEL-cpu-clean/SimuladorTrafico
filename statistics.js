class StatisticsPanel {
  constructor(simulation) {
    this.simulation = simulation;
    this.historyLimit = 46;
    this.labels = [];
    this.speedHistory = [];
    this.vehicleHistory = [];
    this.congestionHistory = [];
    this.lastChartPush = 0;
    this.bindElements();
    this.createCharts();
  }

  bindElements() {
    this.vehicleCount = document.getElementById("vehicleCount");
    this.averageSpeed = document.getElementById("averageSpeed");
    this.flowValue = document.getElementById("flowValue");
    this.densityValue = document.getElementById("densityValue");
    this.congestionBadge = document.getElementById("congestionBadge");
    this.lightStatus = document.getElementById("lightStatus");
  }

  createCharts() {
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: false,
      animation: false,
      plugins: {
        legend: { labels: { color: "#edf4f8" } }
      },
      scales: {
        x: { ticks: { color: "#9fb0bc", maxTicksLimit: 7 }, grid: { color: "rgba(255,255,255,0.06)" } },
        y: { ticks: { color: "#9fb0bc" }, grid: { color: "rgba(255,255,255,0.06)" } }
      }
    };

    this.speedChart = new Chart(document.getElementById("speedChart"), {
      type: "line",
      data: {
        labels: this.labels,
        datasets: [{
          label: "Velocidad promedio km/h",
          data: this.speedHistory,
          borderColor: "#38d6e8",
          backgroundColor: "rgba(56, 214, 232, 0.14)",
          tension: 0.35,
          fill: true
        }]
      },
      options: commonOptions
    });

    this.congestionChart = new Chart(document.getElementById("congestionChart"), {
      type: "line",
      data: {
        labels: this.labels,
        datasets: [
          {
            label: "Vehiculos",
            data: this.vehicleHistory,
            borderColor: "#6ea8ff",
            tension: 0.35
          },
          {
            label: "Congestion %",
            data: this.congestionHistory,
            borderColor: "#ff5d5d",
            tension: 0.35
          }
        ]
      },
      options: commonOptions
    });
  }

  update(now) {
    const stats = this.simulation.lastStats || this.simulation.calculateStats();
    this.vehicleCount.textContent = stats.count.toString();
    this.averageSpeed.textContent = `${stats.averageSpeed.toFixed(1)} km/h`;
    this.flowValue.textContent = `${stats.flow.toFixed(0)} veh/km*h`;
    this.densityValue.textContent = `${stats.density.toFixed(1)} veh/km`;
    this.updateCongestion(stats.congestion);
    this.updateLights();

    if (now - this.lastChartPush > 850) {
      this.lastChartPush = now;
      this.pushChartData(stats);
    }
  }

  updateCongestion(value) {
    let level = "Bajo";
    let className = "low";
    if (value > 35 && value <= 65) {
      level = "Medio";
      className = "medium";
    }
    if (value > 65) {
      level = "Alto";
      className = "high";
    }
    this.congestionBadge.className = `congestion ${className}`;
    this.congestionBadge.querySelector("strong").textContent = level;
  }

  updateLights() {
    this.lightStatus.innerHTML = this.simulation.lights.map(light => {
      const label = light.state === "green" ? "Verde" : light.state === "yellow" ? "Amarillo" : "Rojo";
      return `
        <div class="light-line">
          <span>${light.label}</span>
          <strong class="light-pill" style="background:${light.getColor()}">${label}</strong>
        </div>
      `;
    }).join("");
  }

  pushChartData(stats) {
    // Mantiene una ventana movil para que los graficos se actualicen sin crecer indefinidamente.
    const label = new Date().toLocaleTimeString("es-BO", { minute: "2-digit", second: "2-digit" });
    this.labels.push(label);
    this.speedHistory.push(Number(stats.averageSpeed.toFixed(1)));
    this.vehicleHistory.push(stats.count);
    this.congestionHistory.push(Number(stats.congestion.toFixed(1)));

    while (this.labels.length > this.historyLimit) {
      this.labels.shift();
      this.speedHistory.shift();
      this.vehicleHistory.shift();
      this.congestionHistory.shift();
    }

    this.speedChart.update();
    this.congestionChart.update();
  }
}
