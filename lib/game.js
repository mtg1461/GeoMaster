(function () {
window.GeoMaster = window.GeoMaster || {};

const { countryNames, difficultyBuckets } = window.GeoMaster.countries;
const { generateSeed, shuffleWithSeed } = window.GeoMaster.random;
const { DIFFICULTY_BUCKET_KEYS, DIFFICULTY_RECIPES, ROUND_POINTS } = window.GeoMaster.config;
const { DEFAULT_GAME_MODE_ID, getMode } = window.GeoMaster.gameModes;
const INITIAL_HINT_BASE_DELAY = 5000;
const INITIAL_HINT_PER_LETTER_DELAY = 200;
const NEXT_HINT_DELAY = 2000;

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

function clearFeedbackFx(container) {
  if (!container) {
    return;
  }

  container.replaceChildren();
  container.classList.remove("is-correct", "is-wrong");
  container.closest(".game-hud")?.classList.remove("feedback-correct", "feedback-wrong");
}

function trimConfettiCanvases() {
  document.querySelectorAll("canvas").forEach((canvas) => {
    if (canvas.style.zIndex !== "999999999" || canvas.style.pointerEvents !== "none") {
      return;
    }

    canvas.style.transition = "opacity 160ms ease";
    canvas.style.opacity = "0";
    window.setTimeout(() => canvas.remove(), 180);
  });
}

function playCorrectFx(container) {
  if (!container) {
    return;
  }

  clearFeedbackFx(container);
  if (typeof window.confetti === "function") {
    window.confetti({
      position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
      count: 110,
      size: 1.15,
      velocity: 190,
      fade: true,
    });

    window.setTimeout(() => {
      window.confetti({
        position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
        count: 45,
        size: 0.8,
        velocity: 145,
        fade: true,
      });
    }, 80);

    window.setTimeout(trimConfettiCanvases, 1050);
  }

  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.transform = "none";

  const flash = document.createElement("span");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.background = "radial-gradient(circle at center, rgba(121, 216, 145, 0.42), rgba(47, 157, 104, 0.18) 28%, transparent 68%)";
  flash.style.animation = "feedback-screen-flash 720ms ease-out forwards";
  container.appendChild(flash);

  const burst = document.createElement("span");
  burst.className = "feedback-burst";
  burst.style.position = "fixed";
  burst.style.left = "50%";
  burst.style.top = "50%";
  burst.style.zIndex = "1";
  container.appendChild(burst);

  for (let index = 0; index < 34; index += 1) {
    const piece = document.createElement("span");
    const angle = (360 / 34) * index + (index % 3) * 5;
    const distance = 150 + (index % 5) * 24;

    piece.className = "confetti-piece";
    piece.style.position = "fixed";
    piece.style.left = "50%";
    piece.style.top = "50%";
    piece.style.zIndex = "2";
    piece.style.setProperty("--angle", `${angle}deg`);
    piece.style.setProperty("--distance", `${distance}px`);
    piece.style.setProperty("--spin", `${index % 2 === 0 ? 120 : -120}deg`);
    piece.style.setProperty("--piece-color", ["#79d891", "#2f9d68", "#c4ffdb", "#f2c94c"][index % 4]);
    container.appendChild(piece);
  }

  container.classList.add("is-correct");
  container.closest(".game-hud")?.classList.add("feedback-correct");
  window.setTimeout(() => clearFeedbackFx(container), 900);
}

function playWrongFx(container) {
  if (!container) {
    return;
  }

  clearFeedbackFx(container);
  container.style.position = "fixed";
  container.style.inset = "0";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100vw";
  container.style.height = "100vh";
  container.style.zIndex = "9999";
  container.style.pointerEvents = "none";
  container.style.overflow = "hidden";
  container.style.transform = "none";

  const flash = document.createElement("span");
  flash.style.position = "fixed";
  flash.style.inset = "0";
  flash.style.background = "radial-gradient(circle at center, rgba(200, 71, 62, 0.42), rgba(140, 18, 28, 0.2) 30%, transparent 68%)";
  flash.style.animation = "feedback-screen-flash 620ms ease-out forwards";
  container.appendChild(flash);

  for (let index = 0; index < 2; index += 1) {
    const ring = document.createElement("span");
    ring.className = "wrong-ring";
    ring.style.position = "fixed";
    ring.style.left = "50%";
    ring.style.top = "50%";
    ring.style.zIndex = "2";
    ring.style.setProperty("--ring-delay", `${index * 70}ms`);
    container.appendChild(ring);
  }

  container.classList.add("is-wrong");
  container.closest(".game-hud")?.classList.add("feedback-wrong");
  window.setTimeout(() => clearFeedbackFx(container), 680);
}

class GeoGame {
  constructor({ map, elements }) {
    this.map = map;
    this.elements = elements;
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
    this.hintCursor = 0;
    this.isPaused = false;
    this.revealedIndexes = new Set();
    this.currentLetterIndexes = [];
    this.currentChoices = [];
    this.roundToken = 0;
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
    this.totalRounds = this.rounds.length;
    this.elements.total.textContent = String(this.totalRounds);
    this.elements.score.textContent = formatScore(this.score);
    this.elements.gameDifficulty.textContent = formatDifficulty(this.options.difficulty);
    this.renderModeUi();
    this.elements.menuPanel.hidden = true;
    this.elements.gameOverPanel.hidden = true;
    this.elements.gamePanel.hidden = false;
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
    const roundToken = this.roundToken + 1;
    this.roundToken = roundToken;
    this.elements.round.textContent = String(this.roundIndex);
    this.elements.guess.value = "";
    this.elements.guess.classList.remove("is-wrong");
    this.elements.guessPanel.classList.remove("flash-correct", "flash-timeout");
    this.renderRoundInput();
    const zoomPromise = this.map.zoomToCountry(this.currentCountry);
    this.focusInput();

    Promise.resolve(zoomPromise).then(() => {
      if (this.roundToken !== roundToken || this.isPaused || !this.currentCountry) {
        return;
      }

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
      playWrongFx(this.elements.feedbackFx);
      flashPanel(this.elements.guessPanel, "flash-timeout");
      this.stopTimer();
      this.roundToken += 1;
      this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 760);
      return;
    }

    button?.classList.add("is-correct");
    this.completeRound();
  }

  skip() {
    if (!this.currentCountry) {
      return;
    }

    this.stopTimer();
    this.roundToken += 1;
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
    this.score += this.getRoundPoints();
    this.elements.score.textContent = formatScore(this.score);
    flashPanel(this.elements.guessPanel, "flash-correct");
    playCorrectFx(this.elements.feedbackFx);
    this.map.markFound(this.currentCountry);

    this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 700);
  }

  renderModeUi() {
    const mode = this.getCurrentMode();
    const usesChoices = mode.inputKind === "choice";

    if (this.elements.gameMode) {
      this.elements.gameMode.textContent = mode.label;
    }

    if (this.elements.guessPrompt) {
      this.elements.guessPrompt.textContent = mode.prompt;
    }

    if (this.elements.submit) {
      this.elements.submit.textContent = mode.primaryActionLabel;
      this.elements.submit.hidden = usesChoices;
    }

    if (this.elements.guess) {
      this.elements.guess.type = mode.inputKind === "choice" ? "text" : mode.inputKind || "text";
      this.elements.guess.disabled = usesChoices;
    }

    if (this.elements.guessField) {
      this.elements.guessField.hidden = usesChoices;
    }

    if (this.elements.choicePanel) {
      this.elements.choicePanel.hidden = !usesChoices;
      this.elements.choicePanel.replaceChildren();
    }

    this.elements.guessPanel.classList.toggle("is-choice-mode", usesChoices);
  }

  renderRoundInput() {
    const mode = this.getCurrentMode();

    if (mode.inputKind !== "choice") {
      this.currentChoices = [];
      this.elements.hint.hidden = false;
      renderHint(this.elements.hint, this.currentCountry, this.revealedIndexes);
      this.elements.guess.disabled = false;
      this.elements.submit.disabled = false;
      this.elements.submit.hidden = false;
      this.elements.guessField.hidden = false;
      this.elements.choicePanel.hidden = true;
      this.elements.choicePanel.replaceChildren();
      return;
    }

    this.elements.hint.hidden = true;
    this.elements.hint.replaceChildren();
    this.elements.guessField.hidden = true;
    this.elements.submit.hidden = true;
    this.elements.guess.disabled = true;
    this.elements.choicePanel.hidden = false;
    this.elements.choicePanel.replaceChildren();
    this.currentChoices = mode.buildChoices(this.getChoiceContext());

    this.currentChoices.forEach((choice, index) => {
      const button = document.createElement("button");
      const indexElement = document.createElement("span");
      const labelElement = document.createElement("span");

      button.className = "choice-button";
      button.type = "button";
      button.value = choice;
      indexElement.className = "choice-index";
      indexElement.textContent = String.fromCharCode(65 + index);
      labelElement.className = "choice-label";
      labelElement.textContent = choice;
      button.append(indexElement, labelElement);
      button.addEventListener("click", () => this.selectChoice(choice, button));
      this.elements.choicePanel.appendChild(button);
    });
  }

  disableChoices() {
    [...this.elements.choicePanel.querySelectorAll(".choice-button")].forEach((button) => {
      button.disabled = true;
    });
  }

  lockChoices(selectedButton) {
    [...this.elements.choicePanel.querySelectorAll(".choice-button")].forEach((button) => {
      button.disabled = true;
      button.classList.toggle("is-dimmed", button !== selectedButton);
    });
  }

  focusInput() {
    if (this.getCurrentMode().inputKind === "choice") {
      this.elements.choicePanel.querySelector(".choice-button")?.focus();
      return;
    }

    this.elements.guess.focus();
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
        this.nextRoundTimeout = window.setTimeout(() => this.nextRound(), 900);
        return;
      }

      this.hintTimeout = window.setTimeout(revealNext, NEXT_HINT_DELAY);
    };

    this.hintTimeout = window.setTimeout(revealNext, delay);
  }

  pause() {
    if (!this.currentCountry || this.isPaused) {
      return;
    }

    this.isPaused = true;
    this.stopTimer();
    this.elements.guess.disabled = true;
    this.elements.submit.disabled = true;
    this.disableChoices();
  }

  resume() {
    if (!this.currentCountry || !this.isPaused) {
      return;
    }

    this.isPaused = false;
    this.renderRoundInput();
    this.focusInput();

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
    this.elements.guess.disabled = false;
    this.elements.submit.disabled = false;
    this.elements.guess.value = "";
    this.elements.guess.classList.remove("is-wrong");
    this.elements.guessPanel.classList.remove("flash-correct", "flash-timeout");
    this.currentChoices = [];
    this.elements.choicePanel?.replaceChildren();
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
  }

  finish() {
    this.stopTimer();
    this.roundToken += 1;
    this.currentCountry = null;
    this.elements.guess.disabled = true;
    this.elements.submit.disabled = true;
    this.map.resetZoom();
    this.elements.finalScore.textContent = formatScore(this.score);
    this.elements.finalMaxScore.textContent = String(this.totalRounds * ROUND_POINTS);
    this.elements.gamePanel.hidden = true;
    this.elements.gameOverPanel.hidden = false;
  }
}

window.GeoMaster.GeoGame = GeoGame;
})();
