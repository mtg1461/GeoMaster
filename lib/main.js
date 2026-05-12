(function () {
const elements = {
  map: document.querySelector("#worldMap"),
  marker: document.querySelector("#targetMarker"),
  menuPanel: document.querySelector("#menuPanel"),
  startPanel: document.querySelector("#startPanel"),
  modeSetupPanel: document.querySelector("#modeSetupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  feedbackFx: document.querySelector("#feedbackFx"),
  guessPanel: document.querySelector("#guessPanel"),
  start: document.querySelector("#startGame"),
  backToModes: document.querySelector("#backToModes"),
  modeCards: document.querySelectorAll(".mode-card"),
  mode: document.querySelectorAll('input[name="gameMode"]'),
  moreSettingsToggle: document.querySelector("#moreSettingsToggle"),
  moreSettings: document.querySelector("#moreSettings"),
  backToMenu: document.querySelector("#backToMenu"),
  submit: document.querySelector("#submitGuess"),
  skip: document.querySelector("#skipCountry"),
  quit: document.querySelector("#quitGame"),
  quitDialog: document.querySelector("#quitDialog"),
  cancelQuit: document.querySelector("#cancelQuit"),
  confirmQuit: document.querySelector("#confirmQuit"),
  guess: document.querySelector("#guessInput"),
  difficulty: document.querySelectorAll('input[name="difficulty"]'),
  difficultyDistribution: document.querySelector("#difficultyDistribution"),
  seed: document.querySelector("#seed"),
  randomSeed: document.querySelector("#randomSeed"),
  round: document.querySelector("#round"),
  total: document.querySelector("#total"),
  score: document.querySelector("#score"),
  gameDifficulty: document.querySelector("#gameDifficulty"),
  gameMode: document.querySelector("#gameMode"),
  setupModeName: document.querySelector("#setupModeName"),
  finalScore: document.querySelector("#finalScore"),
  finalMaxScore: document.querySelector("#finalMaxScore"),
  guessPrompt: document.querySelector("#guessPrompt"),
  hint: document.querySelector("#hint"),
  mapStatus: document.querySelector("#mapStatus"),
};

const { GeoGame, MapController } = window.GeoMaster;
const { generateSeed } = window.GeoMaster.random;
const { DIFFICULTY_RECIPES, DISTRIBUTION_TIERS, FIXED_COUNTRY_COUNT } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID, getMode } = window.GeoMaster.gameModes;

elements.seed.value = generateSeed();
elements.start.disabled = true;
elements.mapStatus.textContent = "Loading map...";

const map = new MapController(elements.map, elements.marker);
const game = new GeoGame({ map, elements });
let resizeFrame = 0;
let isMapReady = false;

map.ready()
  .then(() => {
    isMapReady = true;
    elements.mapStatus.textContent = "";
    updateStartState();
  })
  .catch(() => {
    isMapReady = false;
    elements.mapStatus.textContent = "Map failed to load. Refresh the page.";
    updateStartState();
  });

function syncOptions() {
  const difficulty = getSelectedDifficulty();

  if (!difficulty) {
    return false;
  }

  game.setOption("difficulty", difficulty);
  game.setOption("count", FIXED_COUNTRY_COUNT);
  game.setOption("seed", Number(elements.seed.value) || generateSeed());
  game.setOption("mode", getSelectedMode());
  return true;
}

function getSelectedDifficulty() {
  return [...elements.difficulty].find((input) => input.checked)?.value || null;
}

function getSelectedMode() {
  return [...elements.mode].find((input) => input.checked)?.value || DEFAULT_GAME_MODE_ID;
}

function showMenu() {
  game.quitToMenu();
  map.clearFound();
  map.resetZoom();
  elements.gamePanel.hidden = true;
  elements.gameOverPanel.hidden = true;
  elements.startPanel.hidden = false;
  elements.modeSetupPanel.hidden = true;
  elements.menuPanel.hidden = false;
  elements.seed.value = generateSeed();
}

function showModeSetup() {
  const mode = getMode(getSelectedMode());

  clearDifficultySelection();
  elements.setupModeName.textContent = mode.label;
  elements.startPanel.hidden = true;
  elements.modeSetupPanel.hidden = false;
  updateStartState();
}

function clearDifficultySelection() {
  elements.difficulty.forEach((input) => {
    input.checked = false;
  });

  renderDifficultyDistribution();
}

function updateStartState() {
  elements.start.disabled = !isMapReady || !getSelectedDifficulty();
}

function renderDifficultyDistribution() {
  const selectedDifficulty = getSelectedDifficulty();

  elements.difficultyDistribution.textContent = "";

  if (!selectedDifficulty) {
    const placeholder = document.createElement("div");
    placeholder.className = "distribution-placeholder";
    placeholder.textContent = "Select difficulty";
    elements.difficultyDistribution.appendChild(placeholder);
    return;
  }

  const recipe = DIFFICULTY_RECIPES[selectedDifficulty];
  const unit = Math.max(1, Math.floor(FIXED_COUNTRY_COUNT / 5));
  const counts = recipe.map((amount) => amount * unit);
  const total = counts.reduce((sum, amount) => sum + amount, 0);
  let cursor = 0;
  const slices = counts
    .map((count, index) => {
      if (!count) {
        return "";
      }

      const start = cursor;
      cursor += (count / total) * 100;
      return `${DISTRIBUTION_TIERS[index].color} ${start}% ${cursor}%`;
    })
    .filter(Boolean)
    .join(", ");

  const header = document.createElement("div");
  header.className = "distribution-header";
  header.innerHTML = `<span>Question Mix</span><span class="distribution-total">${total} rounds</span>`;

  const body = document.createElement("div");
  body.className = "distribution-body";

  const pie = document.createElement("div");
  pie.className = "pie-chart";
  pie.style.setProperty("--pie-bg", `conic-gradient(${slices})`);
  pie.innerHTML = `<span>${total}</span>`;

  const legend = document.createElement("div");
  legend.className = "distribution-legend";

  counts.forEach((count, index) => {
    const item = document.createElement("div");
    item.className = `legend-item${count === 0 ? " is-empty" : ""}`;
    item.innerHTML = `
      <span class="legend-dot" style="--legend-color: ${DISTRIBUTION_TIERS[index].color}"></span>
      <span>${DISTRIBUTION_TIERS[index].label}</span>
      <strong>${count}</strong>
    `;
    legend.appendChild(item);
  });

  body.append(pie, legend);
  elements.difficultyDistribution.append(header, body);
}

elements.start.addEventListener("click", () => {
  if (!syncOptions()) {
    updateStartState();
    return;
  }

  game.start();
});

elements.mode.forEach((input) => {
  input.addEventListener("change", showModeSetup);
});

elements.modeCards.forEach((card) => {
  card.addEventListener("click", () => {
    window.setTimeout(showModeSetup, 0);
  });
});

elements.backToModes.addEventListener("click", () => {
  elements.modeSetupPanel.hidden = true;
  elements.startPanel.hidden = false;
});

elements.moreSettingsToggle.addEventListener("click", () => {
  const shouldOpen = elements.moreSettings.hidden;
  elements.moreSettings.hidden = !shouldOpen;
  elements.moreSettingsToggle.setAttribute("aria-expanded", String(shouldOpen));
});

elements.submit.addEventListener("click", () => game.submitGuess());
elements.skip.addEventListener("click", () => game.skip());

elements.quit.addEventListener("click", () => {
  game.pause();
  elements.quitDialog.hidden = false;
});

elements.cancelQuit.addEventListener("click", () => {
  elements.quitDialog.hidden = true;
  game.resume();
});

elements.confirmQuit.addEventListener("click", () => {
  elements.quitDialog.hidden = true;
  showMenu();
});

elements.guess.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    game.submitGuess();
  }
});

elements.randomSeed.addEventListener("click", () => {
  elements.seed.value = generateSeed();
});

elements.difficulty.forEach((input) => {
  input.addEventListener("change", () => {
    renderDifficultyDistribution();
    updateStartState();
  });
});

elements.backToMenu.addEventListener("click", () => {
  showMenu();
});

window.addEventListener("resize", () => {
  if (!game.currentCountry || resizeFrame) {
    return;
  }

  resizeFrame = window.requestAnimationFrame(() => {
    resizeFrame = 0;
    map.reframeCountry(game.currentCountry);
  });
});

renderDifficultyDistribution();
})();
