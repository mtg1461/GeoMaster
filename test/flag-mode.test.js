const assert = require("node:assert/strict");
const test = require("node:test");

const { loadBrowserScripts } = require("./helpers/browser-harness");

function loadGameModules() {
  return loadBrowserScripts([
    "lib/countries.js",
    "lib/country-flags.js",
    "lib/random.js",
    "lib/game-config.js",
    "lib/game-modes.js",
  ]).window.GeoMaster;
}

function buildContext(geoMaster, country, difficulty = "normal", roundIndex = 0, seed = 8675309) {
  return {
    country,
    countryNames: geoMaster.countries.countryNames,
    difficulty,
    difficultyBuckets: geoMaster.countries.difficultyBuckets,
    roundIndex,
    seed,
    shuffleWithSeed: geoMaster.random.shuffleWithSeed,
  };
}

test("registers Flag Match without changing the default mode", () => {
  const { gameModes } = loadGameModules();
  const modeIds = Array.from(gameModes.modes, (mode) => mode.id);
  const flagMode = gameModes.getMode("flag-choice");

  assert.equal(gameModes.DEFAULT_GAME_MODE_ID, "multiple-choice");
  assert.equal(gameModes.getMode("not-a-mode").id, "multiple-choice");
  assert.equal(modeIds[0], "multiple-choice");
  assert.equal(modeIds[1], "flag-choice");
  assert.equal(flagMode.inputKind, "multiple-choice");
  assert.equal(flagMode.choicePresentation, "flag");
  assert.equal(flagMode.optionCount, 4);
  assert.equal(flagMode.roundTimeLimit, 10);
  assert.equal(flagMode.usesHints, false);
  assert.equal(flagMode.resolutionDelayMs, 1400);
  assert.equal(flagMode.revealAnswerOnSkip, true);
});

test("builds deterministic flag choices with unique visual identities", () => {
  const geoMaster = loadGameModules();
  const flagMode = geoMaster.gameModes.getMode("flag-choice");

  for (const [index, country] of Array.from(geoMaster.countries.countryNames).entries()) {
    const difficulty = ["easy", "normal", "hard", "expert", "impossible"][index % 5];
    const context = buildContext(geoMaster, country, difficulty, index % 10, 424242);
    const first = Array.from(flagMode.buildChoices(context));
    const second = Array.from(flagMode.buildChoices(context));

    assert.deepEqual(first, second, `choices are not deterministic for ${country}`);
    assert.equal(first.length, 4, `expected four choices for ${country}`);
    assert.ok(first.includes(country), `choices omit the answer for ${country}`);
    assert.equal(new Set(first).size, 4, `duplicate country choice for ${country}`);
    assert.equal(
      new Set(first.map((choice) => geoMaster.countryFlags.getFlag(choice)?.visualId)).size,
      4,
      `duplicate flag artwork choice for ${country}`,
    );
  }
});

test("keeps the original text multiple-choice sequence stable", () => {
  const geoMaster = loadGameModules();
  const context = buildContext(geoMaster, "France", "normal", 3, 123456);
  const multipleChoice = geoMaster.gameModes.getMode("multiple-choice");

  assert.deepEqual(
    Array.from(multipleChoice.buildChoices(context)),
    ["France", "Spain", "Finland", "Palestine"],
  );
  assert.equal(multipleChoice.choicePresentation, undefined);
});
