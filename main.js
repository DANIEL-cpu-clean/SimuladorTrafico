const canvas = document.getElementById("trafficCanvas");
const simulation = new TrafficSimulation(canvas);
const statistics = new StatisticsPanel(simulation);

const scenarioButtons = {
  normal: document.getElementById("normalBtn"),
  rush: document.getElementById("rushBtn"),
  heavy: document.getElementById("heavyBtn"),
  accident: document.getElementById("accidentBtn"),
  works: document.getElementById("worksBtn"),
  stopped: document.getElementById("stoppedBtn")
};

const controls = {
  start: document.getElementById("startBtn"),
  pause: document.getElementById("pauseBtn"),
  reset: document.getElementById("resetBtn"),
  addVehicle: document.getElementById("addVehicleBtn"),
  quickAccident: document.getElementById("quickAccidentBtn"),
  smart: document.getElementById("toggleSmartBtn"),
  night: document.getElementById("nightBtn"),
  day: document.getElementById("dayBtn"),
  rain: document.getElementById("rainBtn"),
  fog: document.getElementById("fogBtn")
};

const scenarioLabel = document.getElementById("scenarioLabel");
const controlModeLabel = document.getElementById("controlModeLabel");
const runStateLabel = document.getElementById("runStateLabel");
const spawnRateInput = document.getElementById("spawnRate");
const speedTargetInput = document.getElementById("speedTarget");
const zoomControl = document.getElementById("zoomControl");

let isRunning = true;
let currentScenario = "normal";

// Conecta botones existentes sin asumir que todos los IDs antiguos siguen presentes.
Object.entries(scenarioButtons).forEach(([type, button]) => {
  if (!button) return;
  button.addEventListener("click", () => {
    setScenario(type);
  });
});

if (spawnRateInput) {
  spawnRateInput.addEventListener("input", () => {
    simulation.spawnRate = Number(spawnRateInput.value);
  });
}

if (speedTargetInput) {
  speedTargetInput.addEventListener("input", () => {
    simulation.targetSpeedKmh = Number(speedTargetInput.value);
  });
}

if (zoomControl) {
  zoomControl.addEventListener("input", () => {
    simulation.zoom = Number(zoomControl.value);
  });
}

controls.start?.addEventListener("click", () => {
  isRunning = true;
  syncInterface(currentScenario);
});

controls.pause?.addEventListener("click", () => {
  isRunning = false;
  syncInterface(currentScenario);
});

controls.reset?.addEventListener("click", () => {
  setScenario(currentScenario);
});

controls.addVehicle?.addEventListener("click", () => {
  for (let i = 0; i < 10; i++) simulation.addVehicle(Math.random() * simulation.pathLength);
  syncInterface(currentScenario);
});

controls.quickAccident?.addEventListener("click", () => {
  setScenario("accident");
});

controls.smart?.addEventListener("click", () => {
  simulation.smartMode = !simulation.smartMode;
  syncInterface(currentScenario);
});

controls.night?.addEventListener("click", () => {
  document.body.classList.add("theme-night");
  document.body.classList.remove("theme-day");
  simulation.environment = "Noche";
  controls.night.classList.add("active");
  controls.day?.classList.remove("active");
});

controls.day?.addEventListener("click", () => {
  document.body.classList.add("theme-day");
  document.body.classList.remove("theme-night");
  simulation.environment = "Dia";
  controls.day.classList.add("active");
  controls.night?.classList.remove("active");
});

controls.rain?.addEventListener("click", () => {
  simulation.weather = simulation.weather === "Lluvia" ? "Normal" : "Lluvia";
  controls.rain.classList.toggle("active", simulation.weather === "Lluvia");
});

controls.fog?.addEventListener("click", () => {
  simulation.weather = simulation.weather === "Niebla" ? "Normal" : "Niebla";
  controls.fog.classList.toggle("active", simulation.weather === "Niebla");
});

function setScenario(type) {
  currentScenario = type;

  // El motor original soporta normal, rush, accident y smart. Los modos nuevos se
  // traducen a configuraciones equivalentes para evitar que la simulacion se detenga.
  if (type === "heavy") {
    simulation.setScenario("rush");
    simulation.scenario = "Trafico pesado";
    simulation.spawnRate = 2.2;
    simulation.targetSpeedKmh = 45;
  } else if (type === "works") {
    simulation.setScenario("accident");
    simulation.scenario = "Obras";
    simulation.spawnRate = 1.05;
    simulation.targetSpeedKmh = 42;
  } else if (type === "stopped") {
    simulation.setScenario("accident");
    simulation.scenario = "Vehiculo detenido";
    simulation.spawnRate = 1.15;
    simulation.targetSpeedKmh = 38;
  } else {
    simulation.setScenario(type);
  }

  syncInterface(type);
}

function syncInterface(type) {
  Object.entries(scenarioButtons).forEach(([key, button]) => {
    button?.classList.toggle("active", key === type);
  });

  if (scenarioLabel) scenarioLabel.textContent = simulation.scenario;
  if (controlModeLabel) controlModeLabel.textContent = simulation.smartMode ? "Inteligente" : "Manual";
  if (runStateLabel) runStateLabel.textContent = isRunning ? "En ejecucion" : "Pausado";
  if (spawnRateInput) spawnRateInput.value = simulation.spawnRate;
  if (speedTargetInput) speedTargetInput.value = simulation.targetSpeedKmh;
  if (zoomControl && simulation.zoom) zoomControl.value = simulation.zoom;

  controls.start?.classList.toggle("active", isRunning);
  controls.pause?.classList.toggle("active", !isRunning);
  controls.smart?.classList.toggle("active", simulation.smartMode);
}

let previousTime = performance.now();

function animationLoop(time) {
  const dt = Math.min(0.05, (time - previousTime) / 1000);
  previousTime = time;

  if (isRunning) simulation.update(dt);
  simulation.draw();
  statistics.update(time);

  requestAnimationFrame(animationLoop);
}

syncInterface("normal");
requestAnimationFrame(animationLoop);
