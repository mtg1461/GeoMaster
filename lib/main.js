(function () {
const elements = {
  map: document.querySelector("#worldMap"),
  marker: document.querySelector("#targetMarker"),
  brandRow: document.querySelector("#brandRow"),
  menuPanel: document.querySelector("#menuPanel"),
  startPanel: document.querySelector("#startPanel"),
  settingsPanel: document.querySelector("#settingsPanel"),
  modeSetupPanel: document.querySelector("#modeSetupPanel"),
  scoreboardPanel: document.querySelector("#scoreboardPanel"),
  gamePanel: document.querySelector("#gamePanel"),
  gameOverPanel: document.querySelector("#gameOverPanel"),
  feedbackFx: document.querySelector("#feedbackFx"),
  guessPanel: document.querySelector("#guessPanel"),
  guessField: document.querySelector("#guessField"),
  choicePanel: document.querySelector("#choicePanel"),
  start: document.querySelector("#startGame"),
  backToModes: document.querySelector("#backToModes"),
  backToSetup: document.querySelector("#backToSetup"),
  showScoreboard: document.querySelector("#showScoreboard"),
  openSettings: document.querySelector("#openSettings"),
  backFromSettings: document.querySelector("#backFromSettings"),
  resetData: document.querySelector("#resetData"),
  modeOptions: document.querySelector("#modeOptions"),
  moreSettingsToggle: document.querySelector("#moreSettingsToggle"),
  moreSettings: document.querySelector("#moreSettings"),
  backToMenu: document.querySelector("#backToMenu"),
  submit: document.querySelector("#submitGuess"),
  skip: document.querySelector("#skipCountry"),
  quit: document.querySelector("#quitGame"),
  quitDialog: document.querySelector("#quitDialog"),
  resetDialog: document.querySelector("#resetDialog"),
  cancelQuit: document.querySelector("#cancelQuit"),
  confirmQuit: document.querySelector("#confirmQuit"),
  cancelReset: document.querySelector("#cancelReset"),
  confirmReset: document.querySelector("#confirmReset"),
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
  scoreboardModeName: document.querySelector("#scoreboardModeName"),
  latestScoreSummary: document.querySelector("#latestScoreSummary"),
  scoreboardList: document.querySelector("#scoreboardList"),
  finalScore: document.querySelector("#finalScore"),
  finalMaxScore: document.querySelector("#finalMaxScore"),
  guessPrompt: document.querySelector("#guessPrompt"),
  hint: document.querySelector("#hint"),
  mapStatus: document.querySelector("#mapStatus"),
};

const { GeoGame, MapController } = window.GeoMaster;
const { generateSeed } = window.GeoMaster.random;
const { FIXED_COUNTRY_COUNT, ROUND_POINTS } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID, getMode, modes } = window.GeoMaster.gameModes;
const { HubView, ScoreboardView, SetupView } = window.GeoMaster.views;
const { APP_STATES, StateMachine } = window.GeoMaster.appState;
const scoreStore = window.GeoMaster.scoreboardStore;

elements.seed.value = generateSeed();
elements.start.disabled = true;
elements.mapStatus.textContent = "Loading map...";

const appState = new StateMachine(APP_STATES.HUB);
const map = new MapController(elements.map, elements.marker);
const game = new GeoGame({
  map,
  elements,
  onFinish: (result) => showFinalScoreboard(result),
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
const scoreboardView = new ScoreboardView({
  elements,
  getMode,
  onBack: showModeSetup,
  store: scoreStore,
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

function setMainMenuChrome(isVisible) {
  elements.brandRow.hidden = !isVisible;
  elements.openSettings.hidden = !isVisible;
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
  setMainMenuChrome(true);
  elements.settingsPanel.hidden = true;
  setupView.hide();
  scoreboardView.hide();
  hubView.show();
}

function showSettings() {
  appState.set(APP_STATES.HUB);
  setMainMenuChrome(false);
  hubView.hide();
  setupView.hide();
  scoreboardView.hide();
  elements.settingsPanel.hidden = false;
}

function showModeSetup(modeId = getSelectedMode()) {
  appState.set(APP_STATES.SETUP);
  selectedModeId = modeId;
  setMainMenuChrome(false);
  hubView.hide();
  elements.settingsPanel.hidden = true;
  scoreboardView.hide();
  setupView.show(selectedModeId);
  updateStartState();
}

function showScoreboard(modeId = getSelectedMode(), latestEntry = null) {
  appState.set(APP_STATES.SETUP);
  selectedModeId = modeId;
  setMainMenuChrome(false);
  hubView.hide();
  elements.settingsPanel.hidden = true;
  setupView.hide();
  scoreboardView.show(selectedModeId, latestEntry);
}

function showFinalScoreboard(result) {
  const modeId = getSelectedMode();
  const latestEntry = scoreStore.addScore(modeId, {
    difficulty: game.options.difficulty,
    maxScore: result.totalRounds * ROUND_POINTS,
    score: result.score,
  });

  appState.set(APP_STATES.GAME_OVER);
  elements.gamePanel.hidden = true;
  elements.gameOverPanel.hidden = true;
  elements.menuPanel.hidden = false;
  showScoreboard(modeId, latestEntry);
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

elements.openSettings.addEventListener("click", () => {
  showSettings();
});

elements.backFromSettings.addEventListener("click", () => {
  showHub();
});

elements.resetData.addEventListener("click", () => {
  elements.resetDialog.hidden = false;
});

elements.cancelReset.addEventListener("click", () => {
  elements.resetDialog.hidden = true;
});

elements.confirmReset.addEventListener("click", () => {
  scoreStore.clearScores();
  elements.resetDialog.hidden = true;
});

elements.showScoreboard.addEventListener("click", () => {
  showScoreboard();
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
