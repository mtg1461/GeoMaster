const assert = require("node:assert/strict");
const test = require("node:test");

const { createElements, loadBrowserScripts } = require("./helpers/browser-harness");

const choices = ["France", "Reunion", "Japan", "Brazil"];

function loadFlagAdapter() {
  const loaded = loadBrowserScripts([
    "lib/countries.js",
    "lib/country-flags.js",
    "lib/random.js",
    "lib/game-config.js",
    "lib/game-modes.js",
    "lib/mode-ui-adapters.js",
  ]);
  const mode = loaded.window.GeoMaster.gameModes.getMode("flag-choice");
  const adapter = loaded.window.GeoMaster.modeUiAdapters.getModeUiAdapter(mode);
  const elements = createElements();
  const selections = [];

  adapter.renderMode({ elements, mode });
  adapter.renderRound({
    choices,
    country: "France",
    elements,
    mode,
    onChoice: (country, button) => selections.push({ button, country }),
  });

  return {
    ...loaded,
    adapter,
    elements,
    mode,
    selections,
  };
}

test("renders canonical, non-revealing flag buttons", () => {
  const { elements, selections, window } = loadFlagAdapter();

  assert.ok(elements.guessPanel.classList.contains("is-flag-choice-mode"));
  assert.ok(elements.choicePanel.classList.contains("is-flag-choice"));
  assert.equal(elements.choicePanel.getAttribute("aria-label"), "Choose the matching flag");
  assert.equal(elements.choicePanel.querySelector(".choice-instruction").textContent, "Choose the matching flag");
  assert.equal(elements.choiceButtons.length, 4);
  assert.equal(elements.choiceStatus.getAttribute("role"), "status");
  assert.equal(elements.choiceStatus.getAttribute("aria-live"), "polite");

  elements.choiceButtons.forEach((button, index) => {
    const country = choices[index];
    const image = button.querySelector(".flag-image");
    const caption = button.querySelector(".flag-caption");

    assert.equal(button.value, country);
    assert.ok(button.classList.contains("choice-button--flag"));
    assert.equal(button.getAttribute("aria-label"), `Flag option ${String.fromCharCode(65 + index)}`);
    assert.ok(!button.getAttribute("aria-label").includes(country));
    assert.ok(!button.classList.contains("is-label-visible"));
    assert.equal(caption.textContent, country);
    assert.equal(caption.getAttribute("aria-hidden"), "true");
    assert.equal(image.alt, "");
    assert.equal(image.getAttribute("aria-hidden"), "true");
    assert.equal(image.width, 300);
    assert.equal(image.height, 200);
    assert.equal(image.src, window.GeoMaster.countryFlags.getFlag(country).src);
  });

  elements.choiceButtons[2].click();
  assert.equal(selections.length, 1);
  assert.equal(selections[0].country, "Japan");
  assert.equal(selections[0].button, elements.choiceButtons[2]);
});

test("reveals names and accessible feedback for correct and wrong answers", () => {
  const correctRound = loadFlagAdapter();
  const correctButton = correctRound.elements.choiceButtons[0];

  correctRound.adapter.lock({
    elements: correctRound.elements,
    selectedButton: correctButton,
  });
  correctRound.adapter.revealAnswer({
    country: "France",
    elements: correctRound.elements,
    outcome: "correct",
    selectedButton: correctButton,
  });

  assert.ok(correctButton.classList.contains("is-label-visible"));
  assert.match(correctButton.getAttribute("aria-label"), /France, correct/u);
  assert.equal(correctButton.querySelector(".flag-caption").getAttribute("aria-hidden"), "false");
  assert.equal(correctRound.elements.choiceStatus.textContent, "Correct. France.");
  assert.equal(
    correctRound.elements.choiceButtons.filter((button) => button.classList.contains("is-label-visible")).length,
    1,
  );

  const wrongRound = loadFlagAdapter();
  const selectedWrong = wrongRound.elements.choiceButtons[2];

  wrongRound.adapter.lock({
    elements: wrongRound.elements,
    selectedButton: selectedWrong,
  });
  wrongRound.adapter.revealAnswer({
    country: "France",
    elements: wrongRound.elements,
    outcome: "wrong",
    selectedButton: selectedWrong,
  });

  assert.ok(selectedWrong.classList.contains("is-label-visible"));
  assert.match(selectedWrong.getAttribute("aria-label"), /Japan, your incorrect choice/u);
  assert.ok(wrongRound.elements.choiceButtons[0].classList.contains("is-label-visible"));
  assert.match(wrongRound.elements.choiceButtons[0].getAttribute("aria-label"), /France, correct answer/u);
  assert.match(wrongRound.elements.choiceStatus.textContent, /You chose Japan.*correct answer is France/u);
  assert.equal(
    wrongRound.elements.choiceButtons.filter((button) => button.classList.contains("is-label-visible")).length,
    2,
  );
});

test("timeout and skip reveal only the correct flag caption", () => {
  for (const [outcome, expectedStatus] of [
    ["timeout", /^Time expired\. The correct answer is France\.$/u],
    ["skip", /^Skipped\. The correct answer is France\.$/u],
  ]) {
    const round = loadFlagAdapter();

    round.adapter.revealAnswer({
      country: "France",
      elements: round.elements,
      outcome,
    });

    const visible = round.elements.choiceButtons.filter((button) => {
      return button.classList.contains("is-label-visible");
    });

    assert.equal(visible.length, 1);
    assert.equal(visible[0].value, "France");
    assert.match(round.elements.choiceStatus.textContent, expectedStatus);
  }
});

test("discloses local or unofficial flag status after resolution", () => {
  const round = loadFlagAdapter();

  round.adapter.revealAnswer({
    country: "Reunion",
    elements: round.elements,
    outcome: "skip",
  });

  const answer = round.elements.choiceButtons.find((button) => button.value === "Reunion");

  assert.equal(answer.querySelector(".flag-status").textContent, "Local/unofficial flag");
  assert.match(answer.getAttribute("aria-label"), /Local\/unofficial flag/u);
  assert.match(round.elements.choiceStatus.textContent, /official flag is France’s tricolour/u);
});

test("falls back to all country names when any image fails", () => {
  const { elements } = loadFlagAdapter();

  elements.choiceButtons[1].querySelector(".flag-image").dispatch("error");

  assert.ok(elements.choicePanel.classList.contains("is-flag-fallback"));
  assert.match(elements.choiceStatus.textContent, /using country names/u);

  elements.choiceButtons.forEach((button) => {
    assert.ok(button.classList.contains("is-label-visible"));
    assert.match(button.getAttribute("aria-label"), new RegExp(button.value, "u"));
    assert.equal(button.querySelector(".flag-caption").getAttribute("aria-hidden"), "false");
    assert.equal(button.querySelector(".flag-image").getAttribute("aria-hidden"), "true");
  });
});

test("ignores image errors from a replaced round", () => {
  const round = loadFlagAdapter();
  const staleImage = round.elements.choiceButtons[0].querySelector(".flag-image");

  round.adapter.renderRound({
    choices,
    country: "France",
    elements: round.elements,
    mode: round.mode,
    onChoice() {},
  });
  staleImage.dispatch("error");

  assert.ok(!round.elements.choicePanel.classList.contains("is-flag-fallback"));
  round.elements.choiceButtons.forEach((button) => {
    assert.ok(!button.classList.contains("is-label-visible"));
    assert.equal(button.getAttribute("aria-label"), `Flag option ${button.dataset.optionLetter}`);
  });
});

test("resets text fallback when the next round renders", () => {
  const round = loadFlagAdapter();

  round.elements.choiceButtons[1].querySelector(".flag-image").dispatch("error");
  assert.ok(round.elements.choicePanel.classList.contains("is-flag-fallback"));

  round.adapter.renderRound({
    choices,
    country: "France",
    elements: round.elements,
    mode: round.mode,
    onChoice() {},
  });

  assert.ok(!round.elements.choicePanel.classList.contains("is-flag-fallback"));
  round.elements.choiceButtons.forEach((button) => {
    assert.ok(!button.classList.contains("is-label-visible"));
    assert.equal(button.querySelector(".flag-caption").getAttribute("aria-hidden"), "true");
  });
});
