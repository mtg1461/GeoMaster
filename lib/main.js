(function () {
const elements = {
  map: document.querySelector("#worldMap"),
  marker: document.querySelector("#targetMarker"),
  brandRow: document.querySelector("#brandRow"),
  menuPanel: document.querySelector("#menuPanel"),
  startPanel: document.querySelector("#startPanel"),
  modeSetupPanel: document.querySelector("#modeSetupPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  feedbackFx: document.querySelector("#feedbackFx"),
  guessPanel: document.querySelector("#guessPanel"),
  guessField: document.querySelector("#guessField"),
  choicePanel: document.querySelector("#choicePanel"),
  start: document.querySelector("#startGame"),
  backToModes: document.querySelector("#backToModes"),
  modeOptions: document.querySelector("#modeOptions"),
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
  roundTimerStat: document.querySelector("#roundTimerStat"),
  roundTimer: document.querySelector("#roundTimer"),
  setupModeIcon: document.querySelector("#setupModeIcon"),
  setupModeName: document.querySelector("#setupModeName"),
  finalScore: document.querySelector("#finalScore"),
  finalMaxScore: document.querySelector("#finalMaxScore"),
  guessPrompt: document.querySelector("#guessPrompt"),
  hint: document.querySelector("#hint"),
  mapStatus: document.querySelector("#mapStatus"),
};

const { GeoGame, MapController } = window.GeoMaster;
const { generateSeed } = window.GeoMaster.random;
const { FIXED_COUNTRY_COUNT } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID, getMode, modes } = window.GeoMaster.gameModes;
const { HubView, SetupView } = window.GeoMaster.views;
const { APP_STATES, StateMachine } = window.GeoMaster.appState;

elements.seed.value = generateSeed();
elements.start.disabled = true;
elements.mapStatus.textContent = "Loading map...";

const appState = new StateMachine(APP_STATES.HUB);
const map = new MapController(elements.map, elements.marker);
const game = new GeoGame({
  map,
  elements,
  onFinish: () => appState.set(APP_STATES.GAME_OVER),
});
let resizeFrame = 0;
let isMapReady = false;
let selectedModeId = DEFAULT_GAME_MODE_ID;

const setupView = new SetupView({
  elements,
  config: window.GeoMaster.config,
  getMode,
  onBack: showHub,
  onDifficultyChange: updateStartState,
});
const hubView = new HubView({
  elements,
  modes,
  onSelectMode: showModeSetup,
});

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
  const difficulty = setupView.getSelectedDifficulty();

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
  return setupView.getSelectedDifficulty();
}

function getSelectedMode() {
  return selectedModeId;
}

function showMenu() {
  appState.set(APP_STATES.HUB);
  game.quitToMenu();
  map.clearFound();
  map.resetZoom();
  elements.gamePanel.hidden = true;
  elements.gameOverPanel.hidden = true;
  showHub();
  elements.menuPanel.hidden = false;
  elements.seed.value = generateSeed();
}

function showHub() {
  appState.set(APP_STATES.HUB);
  setupView.hide();
  hubView.show();
}

function showModeSetup(modeId = getSelectedMode()) {
  appState.set(APP_STATES.SETUP);
  selectedModeId = modeId;
  hubView.hide();
  setupView.show(selectedModeId);
  updateStartState();
}

function updateStartState() {
  setupView.updateStartState(isMapReady);
}

elements.start.addEventListener("click", () => {
  if (!syncOptions()) {
    updateStartState();
    return;
  }

  game.start();
  appState.set(APP_STATES.PLAYING);
});

elements.moreSettingsToggle.addEventListener("click", () => {
  const shouldOpen = elements.moreSettings.hidden;
  elements.moreSettings.hidden = !shouldOpen;
  elements.moreSettingsToggle.setAttribute("aria-expanded", String(shouldOpen));
});

elements.submit.addEventListener("click", () => game.submitGuess());
elements.skip.addEventListener("click", () => game.skip());

elements.quit.addEventListener("click", () => {
  appState.set(APP_STATES.PAUSED);
  game.pause();
  elements.quitDialog.hidden = false;
});

elements.cancelQuit.addEventListener("click", () => {
  elements.quitDialog.hidden = true;
  game.resume();
  appState.set(APP_STATES.PLAYING);
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

hubView.render();
setupView.renderDifficultyDistribution();
})();
