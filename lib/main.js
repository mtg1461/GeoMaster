(function () {
const elements = {
  map: document.querySelector("#worldMap"),
  marker: document.querySelector("#targetMarker"),
  menuPanel: document.querySelector("#menuPanel"),
  startPanel: document.querySelector("#startPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  feedbackFx: document.querySelector("#feedbackFx"),
  guessPanel: document.querySelector("#guessPanel"),
  start: document.querySelector("#startGame"),
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
  finalScore: document.querySelector("#finalScore"),
  finalMaxScore: document.querySelector("#finalMaxScore"),
  guessPrompt: document.querySelector("#guessPrompt"),
  hint: document.querySelector("#hint"),
  mapStatus: document.querySelector("#mapStatus"),
};

const { GeoGame, MapController } = window.GeoMaster;
const { generateSeed } = window.GeoMaster.random;
const { DIFFICULTY_RECIPES, DISTRIBUTION_TIERS, FIXED_COUNTRY_COUNT } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID } = window.GeoMaster.gameModes;

elements.seed.value = generateSeed();
elements.start.disabled = true;
elements.mapStatus.textContent = "Loading map...";

const map = new MapController(elements.map, elements.marker);
const game = new GeoGame({ map, elements });
let resizeFrame = 0;

map.ready()
  .then(() => {
    elements.mapStatus.textContent = "";
    elements.start.disabled = false;
  })
  .catch(() => {
    elements.mapStatus.textContent = "Map failed to load. Refresh the page.";
    elements.start.disabled = true;
  });

function syncOptions() {
  game.setOption("difficulty", getSelectedDifficulty());
  game.setOption("count", FIXED_COUNTRY_COUNT);
  game.setOption("seed", Number(elements.seed.value) || generateSeed());
  game.setOption("mode", getSelectedMode());
}

function getSelectedDifficulty() {
  return [...elements.difficulty].find((input) => input.checked)?.value || "normal";
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
  elements.menuPanel.hidden = false;
  elements.seed.value = generateSeed();
}

function renderDifficultyDistribution() {
  const recipe = DIFFICULTY_RECIPES[getSelectedDifficulty()];
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

  elements.difficultyDistribution.textContent = "";

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
  syncOptions();
  game.start();
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
  input.addEventListener("change", renderDifficultyDistribution);
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
