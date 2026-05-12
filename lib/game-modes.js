(function () {
window.GeoMaster = window.GeoMaster || {};

function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

const TYPED_COUNTRY_MODE = {
  id: "typed-country",
  label: "Type Answer",
  prompt: "Guess the country",
  inputKind: "text",
  icon: "assets/typing.svg",
  primaryActionLabel: "Guess",
  isCorrect({ guess, country }) {
    return normalizeAnswer(guess) === normalizeAnswer(country);
  },
};

const modes = [TYPED_COUNTRY_MODE];
const modeById = new Map(modes.map((mode) => [mode.id, mode]));
const DEFAULT_GAME_MODE_ID = TYPED_COUNTRY_MODE.id;

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
