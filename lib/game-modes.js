(function () {
window.GeoMaster = window.GeoMaster || {};

function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

function buildCountryChoices({ country, countryNames, roundIndex, seed, shuffleWithSeed }, choiceCount = 4) {
  const distractors = shuffleWithSeed(
    countryNames.filter((candidate) => normalizeAnswer(candidate) !== normalizeAnswer(country)),
    Number(seed) + (roundIndex * 97),
  ).slice(0, choiceCount - 1);

  return shuffleWithSeed([country, ...distractors], Number(seed) + (roundIndex * 131));
}

const SELECT_COUNTRY_MODE = {
  id: "select-country",
  label: "Select Correct One",
  prompt: "Select the correct country",
  inputKind: "choice",
  icon: "assets/selection.svg",
  primaryActionLabel: "Select",
  choiceCount: 4,
  usesHints: false,
  buildChoices(context) {
    return buildCountryChoices(context, this.choiceCount);
  },
  isCorrect({ guess, country }) {
    return normalizeAnswer(guess) === normalizeAnswer(country);
  },
};

const TYPED_COUNTRY_MODE = {
  id: "typed-country",
  label: "Type Answer",
  prompt: "Guess the country",
  inputKind: "text",
  icon: "assets/typing.svg",
  primaryActionLabel: "Guess",
  usesHints: true,
  isCorrect({ guess, country }) {
    return normalizeAnswer(guess) === normalizeAnswer(country);
  },
};

const modes = [SELECT_COUNTRY_MODE, TYPED_COUNTRY_MODE];
const modeById = new Map(modes.map((mode) => [mode.id, mode]));
const DEFAULT_GAME_MODE_ID = SELECT_COUNTRY_MODE.id;

function getMode(modeId) {
  return modeById.get(modeId) || modeById.get(DEFAULT_GAME_MODE_ID);
}

window.GeoMaster.gameModes = {
  DEFAULT_GAME_MODE_ID,
  modes,
  getMode,
  normalizeAnswer,
};
})();
