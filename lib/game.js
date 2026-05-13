(function () {
window.GeoMaster = window.GeoMaster || {};

const { countryNames, difficultyBuckets } = window.GeoMaster.countries;
const { generateSeed, shuffleWithSeed } = window.GeoMaster.random;
const { DIFFICULTY_BUCKET_KEYS, DIFFICULTY_RECIPES, ROUND_POINTS } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID, getMode } = window.GeoMaster.gameModes;
const { getModeUiAdapter } = window.GeoMaster.modeUiAdapters;
const { clearFeedbackFx, playCorrectFx, playWrongFx } = window.GeoMaster.feedbackEffects;
const INITIAL_HINT_BASE_DELAY = 5000;
const INITIAL_HINT_PER_LETTER_DELAY = 200;
const NEXT_HINT_DELAY = 2000;
const TRANSITION_PREP_DELAY = 60;

function renderHint(container, country, revealedIndexes) {
  container.textContent = "";

  [...country].forEach((letter, index) => {
    const slot = document.createElement("span");

    if (/[a-z]/i.test(letter)) {
      slot.className = "letter-slot";
      slot.textContent = revealedIndexes.has(index) ? letter.toUpperCase() : "";
    } else if (letter === " ") {
      slot.className = "letter-space";
      slot.setAttribute("aria-label", "space");
    } else {
      slot.className = "letter-mark";
      slot.textContent = letter;
    }

    container.appendChild(slot);
  });
}

function getLetterIndexes(country) {
  return [...country]
    .map((letter, index) => (/[a-z]/i.test(letter) ? index : null))
    .filter((index) => index !== null);
}

function getCountrySeed(country, seed) {
  return [...country].reduce((value, letter) => value + letter.charCodeAt(0), Number(seed) || 1);
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatDifficulty(difficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

function flashPanel(panel, className) {
  panel.classList.remove("flash-correct", "flash-timeout");
  void panel.offsetWidth;
  panel.classList.add(className);
}

function getSeededUnit(seed) {
  const value = Math.sin(seed) * 10000;
  return value - Math.floor(value);
}

function waitForTransitionPrep() {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(resolve, TRANSITION_PREP_DELAY);
      });
    });
  });
}

class GeoGame {
  constructor({ map, elements, onFinish = () => {} }) {
    this.map = map;
    this.elements = elements;
    this.onFinish = onFinish;
    this.options = {
      difficulty: "easy",
      count: 10,
      seed: generateSeed(),
      mode: DEFAULT_GAME_MODE_ID,
    };
    this.rounds = [];
    this.currentCountry = null;
    this.score = 0;
    this.roundIndex = 0;
    this.totalRounds = 0;
    this.hintTimeout = 0;
    this.nextRoundTimeout = 0;
    this.roundTimerInterval = 0;
    this.roundTimerEndTime = 0;
    this.roundTimerRemaining = 0;
    this.roundTimerLastDisplay = null;
    this.hintCursor = 0;
    this.isPaused = false;
    this.revealedIndexes = new Set();
    this.currentLetterIndexes = [];
    this.currentChoices = [];
    this.roundToken = 0;
    this.mapClickHandler = null;
    this.isRoundResolving = false;
    this.isTransitionPreparing = false;
    this.shouldRevealAnswerPanelAfterTransition = false;
  }

  setOption(name, value) {
    this.options[name] = value;
  }

  start() {
    if (!this.map.svg) {
      this.elements.mapStatus.textContent = "Map is still loading.";
      return;
    }

    this.stopTimer();
    this.map.clearFound();
    this.map.resetZoom();
    this.score = 0;
    this.roundIndex = 0;
    this.rounds = this.buildRounds();
    this.map.preloadCountries(this.rounds);
    this.totalRounds = this.rounds.length;
    this.elements.total.textContent = String(this.totalRounds);
    this.elements.score.textContent = formatScore(this.score);
    this.elements.gameDifficulty.textContent = formatDifficulty(this.options.difficulty);
    this.renderModeUi();
    this.resetRoundTimerDisplay();
    this.elements.menuPanel.hidden = true;
    this.elements.gameOverPanel.hidden = true;
    this.elements.gamePanel.hidden = false;
    this.map.mapContainer.closest(".map-stage")?.classList.add("is-game-active");
    this.nextRound();
  }

  buildRounds() {
    const recipe = DIFFICULTY_RECIPES[this.options.difficulty] || DIFFICULTY_RECIPES.normal;
    const unit = Math.max(1, Math.floor(this.options.count / 5));
    const selected = recipe.flatMap((multiplier, index) => {
      const bucket = difficultyBuckets[DIFFICULTY_BUCKET_KEYS[index]];
      return shuffleWithSeed(bucket, Number(this.options.seed) + index).slice(0, multiplier * unit);
    });

    return shuffleWithSeed(selected, Number(this.options.seed)).filter((country) => this.map.hasCountry(country));
  }

  nextRound() {
    this.stopTimer();
    clearFeedbackFx(this.elements.feedbackFx);
    this.revealedIndexes.clear();
    this.currentCountry = this.rounds.shift() || null;

    if (!this.currentCountry) {
      this.finish();
      return;
    }

    this.roundIndex += 1;
    this.currentLetterIndexes = shuffleWithSeed(
      getLetterIndexes(this.currentCountry),
      getCountrySeed(this.currentCountry, this.options.seed) + this.roundIndex,
    );
    this.hintCursor = 0;
    this.isPaused = false;
    this.isRoundResolving = false;
    const roundToken = this.roundToken + 1;
    this.roundToken = roundToken;
    this.elements.round.textContent = String(this.roundIndex);
    this.elements.guess.value = "";
    this.elements.guess.classList.remove("is-wrong");
    this.elements.guessPanel.classList.remove("flash-correct", "flash-timeout");
    this.elements.guessPanel.hidden = true;
    this.clearRoundInput();
    this.resetRoundTimerDisplay();
    const mode = this.getCurrentMode();
    const transitionOptions = {
      cameraProfile: mode.inputKind === "map-click" ? "pick" : "answer",
      highlight: mode.revealTargetOnZoom !== false,
      showTinyMarker: mode.showTinyMarker !== false,
      viewportOffset: this.getViewportOffset(mode),
    };
    const preparedTransition = this.map.prepareCountryTransition(this.currentCountry, transitionOptions);

    if (!preparedTransition) {
      this.nextRound();
      return;
    }

    this.renderRoundInput();
    this.shouldRevealAnswerPanelAfterTransition = !this.elements.answerPanel.hidden;

    if (this.shouldRevealAnswerPanelAfterTransition) {
      this.elements.answerPanel.hidden = true;
    }

    this.isTransitionPreparing = true;
    const zoomPromise = waitForTransitionPrep().then(() => {
      if (this.roundToken !== roundToken || this.isPaused || !this.currentCountry) {
        this.isTransitionPreparing = false;
        return null;
      }

      this.isTransitionPreparing = false;
      return this.map.zoomToPreparedCountry(preparedTransition);
    });

    Promise.resolve(zoomPromise).then((target) => {
      this.isTransitionPreparing = false;

      if (!target || this.roundToken !== roundToken || this.isPaused || !this.currentCountry) {
        return;
      }

      if (this.shouldRevealAnswerPanelAfterTransition) {
        this.elements.answerPanel.hidden = false;
      }

      this.shouldRevealAnswerPanelAfterTransition = false;
      this.elements.guessPanel.hidden = false;
      this.focusInput();
      this.enableMapClickRound();
      this.startRoundTimer();

      if (this.getCurrentMode().usesHints !== false) {
        this.startHints(this.getInitialHintDelay());
      }
    });
  }

  submitGuess() {
    if (!this.currentCountry) {
      return;
    }

    if (!this.isCorrectAnswer(this.elements.guess.value)) {
      this.elements.guess.classList.remove("is-correct");
      this.elements.guess.classList.add("is-wrong");
      window.GeoMaster.soundEffects?.play("wrongAnswer");
      playWrongFx(this.elements.feedbackFx);
      return;
    }

    this.completeRound();
  }

  selectChoice(choice, button) {
    if (!this.currentCountry) {
      return;
    }

    this.elements.guess.value = choice;
    this.lockChoices(button);

    if (!this.isCorrectAnswer(choice)) {
      button?.classList.add("is-wrong");
      this.revealCorrectChoice(button);
      window.GeoMaster.soundEffects?.play("wrongAnswer");
      playWrongFx(this.elements.feedbackFx);
      flashPanel(this.elements.guessPanel, "flash-timeout");
      this.isRoundResolving = true;
      this.stopTimer();
      this.roundToken += 1;
      this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 760);
      return;
    }

    button?.classList.add("is-correct");
    this.completeRound();
  }

  selectMapCountry(country) {
    if (!this.currentCountry || !country) {
      return;
    }

    this.elements.guess.value = country;
    this.disableMapClickRound();

    if (!this.isCorrectAnswer(country)) {
      this.map.markWrongSelection(country);
      this.map.revealAnswer(this.currentCountry);
      window.GeoMaster.soundEffects?.play("wrongAnswer");
      playWrongFx(this.elements.feedbackFx);
      flashPanel(this.elements.guessPanel, "flash-timeout");
      this.isRoundResolving = true;
      this.stopTimer();
      this.roundToken += 1;
      this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 760);
      return;
    }

    this.completeRound();
  }

  skip() {
    if (!this.currentCountry) {
      return;
    }

    this.stopTimer();
    this.roundToken += 1;
    this.isRoundResolving = true;
    flashPanel(this.elements.guessPanel, "flash-timeout");
    this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 650);
  }

  getCurrentMode() {
    return getMode(this.options.mode);
  }

  getChoiceContext() {
    return {
      country: this.currentCountry,
      countryNames,
      difficulty: this.options.difficulty,
      difficultyBuckets,
      roundIndex: this.roundIndex,
      seed: this.options.seed,
      shuffleWithSeed,
    };
  }

  isCorrectAnswer(guess) {
    return this.getCurrentMode().isCorrect({
      country: this.currentCountry,
      guess,
      roundIndex: this.roundIndex,
      score: this.score,
    });
  }

  completeRound() {
    this.stopTimer();
    this.roundToken += 1;
    this.isRoundResolving = true;
    this.score += this.getRoundPoints();
    this.elements.score.textContent = formatScore(this.score);
    flashPanel(this.elements.guessPanel, "flash-correct");
    window.GeoMaster.soundEffects?.play("correctAnswer");
    playCorrectFx(this.elements.feedbackFx);
    this.map.markFound(this.currentCountry);

    this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 700);
  }

  renderModeUi() {
    const mode = this.getCurrentMode();
    getModeUiAdapter(mode).renderMode({ elements: this.elements, mode });
    this.updateRoundTimerVisibility();
  }

  getViewportOffset(mode) {
    if (mode.inputKind !== "map-click") {
      return null;
    }

    const baseSeed = getCountrySeed(this.currentCountry, this.options.seed) + (this.roundIndex * 211);
    const x = (getSeededUnit(baseSeed) * 2) - 1;
    const y = (getSeededUnit(baseSeed + 97) * 2) - 1;

    return {
      x: Math.abs(x) < 0.28 ? x + (x < 0 ? -0.38 : 0.38) : x,
      y: Math.abs(y) < 0.28 ? y + (y < 0 ? -0.38 : 0.38) : y,
    };
  }

  clearRoundInput() {
    this.currentChoices = [];
    this.elements.hint.replaceChildren();
    this.elements.guess.disabled = true;
    this.elements.submit.disabled = true;
    this.elements.choicePanel.replaceChildren();
    this.elements.mapClickPrompt.hidden = true;
    this.elements.mapClickPrompt.textContent = "";
  }

  renderRoundInput() {
    const mode = this.getCurrentMode();
    const adapter = getModeUiAdapter(mode);

    if (mode.inputKind === "choice") {
      this.currentChoices = mode.buildChoices(this.getChoiceContext());
    } else {
      this.currentChoices = [];
    }

    adapter.renderRound({
      choices: this.currentChoices,
      country: this.currentCountry,
      elements: this.elements,
      onChoice: (choice, button) => this.selectChoice(choice, button),
      renderHint,
      revealedIndexes: this.revealedIndexes,
    });
  }

  disableChoices() {
    getModeUiAdapter(this.getCurrentMode()).disable({ elements: this.elements });
  }

  lockChoices(selectedButton) {
    getModeUiAdapter(this.getCurrentMode()).lock?.({ elements: this.elements, selectedButton });
  }

  revealCorrectChoice(selectedButton = null) {
    getModeUiAdapter(this.getCurrentMode()).revealAnswer?.({
      country: this.currentCountry,
      elements: this.elements,
      selectedButton,
    });
  }

  focusInput() {
    getModeUiAdapter(this.getCurrentMode()).focus({ elements: this.elements });
  }

  enableMapClickRound() {
    if (this.getCurrentMode().inputKind !== "map-click" || !this.map.svg || this.mapClickHandler) {
      return;
    }

    this.mapClickHandler = (event) => {
      const country = this.map.getCountryFromElement(event.target);

      if (!country) {
        return;
      }

      this.selectMapCountry(country);
    };
    this.map.setPickingEnabled(true);
    this.map.svg.addEventListener("click", this.mapClickHandler);
  }

  disableMapClickRound() {
    if (!this.map.svg) {
      this.mapClickHandler = null;
      return;
    }

    if (!this.mapClickHandler) {
      this.map.setPickingEnabled(false);
      return;
    }

    this.map.svg.removeEventListener("click", this.mapClickHandler);
    this.mapClickHandler = null;
    this.map.setPickingEnabled(false);
  }

  getRoundTimeLimit() {
    return this.getCurrentMode().roundTimeLimit || 0;
  }

  updateRoundTimerVisibility() {
    if (!this.elements.roundTimerStat) {
      return;
    }

    const timeLimit = this.getRoundTimeLimit();
    this.elements.roundTimerStat.hidden = true;
    this.elements.roundTimerStat.classList.remove("is-urgent", "is-timeout");
    this.elements.roundTimerStat.style.setProperty("--timer-progress", "360deg");
    this.roundTimerLastDisplay = timeLimit || null;

    if (timeLimit && this.elements.roundTimer) {
      this.elements.roundTimer.textContent = String(timeLimit);
    }
  }

  resetRoundTimerDisplay() {
    const timeLimit = this.getRoundTimeLimit();

    if (!this.elements.roundTimerStat || !this.elements.roundTimer) {
      return;
    }

    this.elements.roundTimerStat.hidden = true;
    this.elements.roundTimerStat.classList.remove("is-urgent", "is-timeout");
    this.elements.roundTimerStat.style.setProperty("--timer-progress", "360deg");
    this.elements.roundTimer.textContent = String(timeLimit || "");
    this.elements.roundTimer.classList.remove("is-pop");
    this.roundTimerLastDisplay = timeLimit || null;
  }

  startRoundTimer(duration = this.getRoundTimeLimit()) {
    this.stopRoundTimer();

    if (!duration || !this.elements.roundTimerStat || !this.elements.roundTimer) {
      return;
    }

    this.elements.roundTimerStat.hidden = false;
    this.elements.roundTimerStat.classList.remove("is-timeout");
    this.roundTimerRemaining = null;
    this.roundTimerEndTime = performance.now() + (duration * 1000);

    const updateTimer = () => {
      const remainingMs = Math.max(0, this.roundTimerEndTime - performance.now());
      const secondsLeft = Math.ceil(remainingMs / 1000);

      if (secondsLeft <= 0) {
        this.elements.roundTimerStat.style.setProperty("--timer-progress", "0deg");
        this.handleRoundTimerExpired();
        return;
      }

      if (this.roundTimerRemaining !== secondsLeft) {
        this.roundTimerRemaining = secondsLeft;
        this.elements.roundTimer.textContent = String(secondsLeft);
        window.GeoMaster.soundEffects?.play("timerTick");
        this.popRoundTimer(secondsLeft);
        this.elements.roundTimerStat.classList.toggle("is-urgent", secondsLeft <= 3);
        this.elements.roundTimerStat.style.setProperty("--timer-progress", `${(secondsLeft / duration) * 360}deg`);
      }
    };

    updateTimer();
    this.roundTimerInterval = window.setInterval(updateTimer, 100);
  }

  stopRoundTimer() {
    if (!this.roundTimerInterval) {
      return;
    }

    window.clearInterval(this.roundTimerInterval);
    this.roundTimerInterval = 0;
  }

  handleRoundTimerExpired() {
    if (!this.currentCountry || this.isPaused || !this.getRoundTimeLimit()) {
      return;
    }

    this.stopRoundTimer();
    window.GeoMaster.soundEffects?.play("timerTimeout");
    this.elements.roundTimerStat.classList.remove("is-urgent");
    this.elements.roundTimerStat.classList.add("is-timeout");
    this.elements.roundTimer.textContent = "TIMEOUT";
    this.elements.roundTimer.classList.remove("is-pop");
    this.elements.roundTimerStat.style.setProperty("--timer-progress", "360deg");

    if (this.getCurrentMode().inputKind === "map-click") {
      this.disableMapClickRound();
      this.map.revealAnswer(this.currentCountry);
    } else {
      this.revealCorrectChoice();
    }
    this.roundToken += 1;
    this.isRoundResolving = true;
    flashPanel(this.elements.guessPanel, "flash-timeout");
    this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 650);
  }

  popRoundTimer(displayValue) {
    if (this.roundTimerLastDisplay === displayValue || !this.elements.roundTimer) {
      return;
    }

    this.roundTimerLastDisplay = displayValue;
    this.elements.roundTimer.classList.remove("is-pop");
    void this.elements.roundTimer.offsetWidth;
    this.elements.roundTimer.classList.add("is-pop");
  }

  getInitialHintDelay() {
    return INITIAL_HINT_BASE_DELAY + (this.currentLetterIndexes.length * INITIAL_HINT_PER_LETTER_DELAY);
  }

  startHints(delay) {
    const revealNext = () => {
      if (this.isPaused) {
        return;
      }

      this.revealedIndexes.add(this.currentLetterIndexes[this.hintCursor]);
      renderHint(this.elements.hint, this.currentCountry, this.revealedIndexes);
      this.hintCursor += 1;

      if (this.hintCursor >= this.currentLetterIndexes.length) {
        flashPanel(this.elements.guessPanel, "flash-timeout");
        this.isRoundResolving = true;
        this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 900);
        return;
      }

      this.hintTimeout = window.setTimeout(revealNext, NEXT_HINT_DELAY);
    };

    this.hintTimeout = window.setTimeout(revealNext, delay);
  }

  continueHints(delay = NEXT_HINT_DELAY) {
    const revealNext = () => {
      if (this.isPaused) {
        return;
      }

      this.revealedIndexes.add(this.currentLetterIndexes[this.hintCursor]);
      this.hintCursor += 1;
      renderHint(this.elements.hint, this.currentCountry, this.revealedIndexes);

      if (this.hintCursor >= this.currentLetterIndexes.length) {
        flashPanel(this.elements.guessPanel, "flash-timeout");
        this.isRoundResolving = true;
        this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 900);
        return;
      }

      this.hintTimeout = window.setTimeout(revealNext, NEXT_HINT_DELAY);
    };

    this.hintTimeout = window.setTimeout(revealNext, delay);
  }

  pause() {
    if (!this.currentCountry || this.isPaused || this.isRoundResolving) {
      return false;
    }

    this.isPaused = true;
    this.roundTimerRemaining = Math.max(0, Math.ceil((this.roundTimerEndTime - performance.now()) / 1000));
    this.stopTimer();
    this.elements.guess.disabled = true;
    this.elements.submit.disabled = true;
    this.disableChoices();
    return true;
  }

  resume() {
    if (!this.currentCountry || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.isRoundResolving = false;
    this.renderRoundInput();
    this.focusInput();
    this.elements.guessPanel.hidden = false;
    this.enableMapClickRound();

    if (this.getRoundTimeLimit()) {
      this.startRoundTimer(this.roundTimerRemaining || this.getRoundTimeLimit());
    }

    if (this.getCurrentMode().usesHints === false) {
      return;
    }

    if (this.hintCursor >= this.currentLetterIndexes.length) {
      this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 600);
      return;
    }

    this.continueHints();
  }

  quitToMenu() {
    this.stopTimer();
    this.roundToken += 1;
    this.currentCountry = null;
    this.rounds = [];
    this.isPaused = false;
    this.isRoundResolving = false;
    this.isTransitionPreparing = false;
    this.elements.guess.disabled = false;
    this.elements.submit.disabled = false;
    this.elements.guess.value = "";
    this.elements.guess.classList.remove("is-wrong");
    this.elements.guessPanel.classList.remove("flash-correct", "flash-timeout");
    this.elements.guessPanel.hidden = true;
    this.elements.answerPanel.hidden = true;
    this.shouldRevealAnswerPanelAfterTransition = false;
    this.map.mapContainer.closest(".map-stage")?.classList.remove("is-game-active");
    this.currentChoices = [];
    this.resetRoundTimerDisplay();
    this.map.clearRoundFeedback();
    getModeUiAdapter(this.getCurrentMode()).cleanup({ elements: this.elements });
  }

  getRoundPoints() {
    const totalLetters = this.currentLetterIndexes.length;

    if (!totalLetters) {
      return ROUND_POINTS;
    }

    const hiddenLetters = Math.max(totalLetters - this.revealedIndexes.size, 0);
    return Number(((hiddenLetters / totalLetters) * ROUND_POINTS).toFixed(1));
  }

  stopTimer() {
    if (this.hintTimeout) {
      window.clearTimeout(this.hintTimeout);
      this.hintTimeout = 0;
    }

    if (this.nextRoundTimeout) {
      window.clearTimeout(this.nextRoundTimeout);
      this.nextRoundTimeout = 0;
    }

    this.stopRoundTimer();
    this.disableMapClickRound();
  }

  finish() {
    this.stopTimer();
    this.roundToken += 1;
    this.currentCountry = null;
    this.isRoundResolving = false;
    this.isTransitionPreparing = false;
    this.elements.guess.disabled = true;
    this.elements.submit.disabled = true;
    this.map.resetZoom();
    this.elements.guessPanel.hidden = true;
    this.elements.answerPanel.hidden = true;
    this.shouldRevealAnswerPanelAfterTransition = false;
    this.map.mapContainer.closest(".map-stage")?.classList.remove("is-game-active");
    this.elements.finalScore.textContent = formatScore(this.score);
    this.elements.finalMaxScore.textContent = String(this.totalRounds * ROUND_POINTS);
    this.elements.gamePanel.hidden = true;
    this.elements.gameOverPanel.hidden = false;
    this.resetRoundTimerDisplay();
    window.GeoMaster.soundEffects?.play("gameEnd");
    this.onFinish({
      score: this.score,
      totalRounds: this.totalRounds,
    });
  }
}

window.GeoMaster.GeoGame = GeoGame;
})();
