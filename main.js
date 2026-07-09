const canvas = document.getElementById("trafficCanvas");
const simulation = new TrafficSimulation(canvas);
const statistics = new StatisticsPanel(simulation);

const buttons = {
  normal: document.getElementById("normalBtn"),
  rush: document.getElementById("rushBtn"),
  accident: document.getElementById("accidentBtn"),
  smart: document.getElementById("smartBtn")
};

const scenarioLabel = document.getElementById("scenarioLabel");
const controlModeLabel = document.getElementById("controlModeLabel");
const spawnRateInput = document.getElementById("spawnRate");
const speedTargetInput = document.getElementById("speedTarget");

Object.entries(buttons).forEach(([type, button]) => {
  button.addEventListener("click", () => {
    simulation.setScenario(type);
    syncInterface(type);
  });
});

spawnRateInput.addEventListener("input", () => {
  simulation.spawnRate = Number(spawnRateInput.value);
});

speedTargetInput.addEventListener("input", () => {
  simulation.targetSpeedKmh = Number(speedTargetInput.value);
});

function syncInterface(type) {
  Object.entries(buttons).forEach(([key, button]) => {
    button.classList.toggle("active", key === type);
  });
  scenarioLabel.textContent = simulation.scenario;
  controlModeLabel.textContent = simulation.smartMode ? "Inteligente" : "Manual";
  spawnRateInput.value = simulation.spawnRate;
  speedTargetInput.value = simulation.targetSpeedKmh;
}

let previousTime = performance.now();

function animationLoop(time) {
  // requestAnimationFrame sincroniza el modelo, el dibujo y los paneles en tiempo real.
  const dt = Math.min(0.05, (time - previousTime) / 1000);
  previousTime = time;
  simulation.update(dt);
  simulation.draw();
  statistics.update(time);
  requestAnimationFrame(animationLoop);
}

syncInterface("normal");
requestAnimationFrame(animationLoop);
