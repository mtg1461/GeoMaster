const assert = require("node:assert/strict");
const test = require("node:test");

const { FakeElement, loadBrowserScripts } = require("./helpers/browser-harness");

function loadGame() {
  const scheduledTimeouts = [];
  const mode = {
    id: "flag-choice",
    resolutionDelayMs: 1400,
    revealAnswerOnSkip: true,
  };
  const window = {
    clearTimeout() {},
    setTimeout(callback, delay) {
      scheduledTimeouts.push({ callback, delay });
      return scheduledTimeouts.length;
    },
    GeoMaster: {
      config: {
        DIFFICULTY_BUCKET_KEYS: [],
        DIFFICULTY_RECIPES: { normal: [] },
        ROUND_POINTS: 10,
      },
      countries: {
        countryNames: [],
        difficultyBuckets: {},
      },
      feedbackEffects: {
        clearFeedbackFx() {},
        playCorrectFx() {},
        playWrongFx() {},
      },
      gameModes: {
        DEFAULT_GAME_MODE_ID: mode.id,
        getMode() {
          return mode;
        },
      },
      modeUiAdapters: {
        getModeUiAdapter() {
          return {};
        },
      },
      random: {
        generateSeed() {
          return 1;
        },
        shuffleWithSeed(values) {
          return values;
        },
      },
    },
  };

  loadBrowserScripts(["lib/game.js"], { window });

  const elements = {
    guessPanel: new FakeElement("section"),
    skip: new FakeElement("button"),
  };
  const game = new window.GeoMaster.GeoGame({
    elements,
    map: { svg: null },
  });

  return { elements, game, scheduledTimeouts };
}

test("skip cannot replace an answer-resolution timeout", () => {
  const { elements, game, scheduledTimeouts } = loadGame();
  let stopCalls = 0;

  game.currentCountry = "France";
  game.nextRoundTimeout = 91;
  game.stopTimer = () => {
    stopCalls += 1;
  };
  game.setRoundResolving(true);
  game.skip();

  assert.equal(stopCalls, 0);
  assert.equal(game.nextRoundTimeout, 91);
  assert.equal(scheduledTimeouts.length, 0);
  assert.equal(elements.skip.disabled, true);
});

test("skip locks the round for the configured reveal delay", () => {
  const { elements, game, scheduledTimeouts } = loadGame();
  const reveals = [];
  let stopCalls = 0;

  game.currentCountry = "France";
  game.stopTimer = () => {
    stopCalls += 1;
  };
  game.revealCorrectChoice = (selectedButton, outcome) => {
    reveals.push({ outcome, selectedButton });
  };
  game.skip();

  assert.equal(stopCalls, 1);
  assert.equal(game.isRoundResolving, true);
  assert.equal(elements.skip.disabled, true);
  assert.deepEqual(reveals, [{ outcome: "skip", selectedButton: null }]);
  assert.equal(scheduledTimeouts.length, 1);
  assert.equal(scheduledTimeouts[0].delay, 1400);
  assert.equal(game.nextRoundTimeout, 1);

  game.setRoundResolving(false);
  assert.equal(elements.skip.disabled, false);
});
