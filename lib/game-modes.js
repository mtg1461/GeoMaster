(function () {
window.GeoMaster = window.GeoMaster || {};

const { DIFFICULTY_BUCKET_KEYS, DIFFICULTY_RECIPES } = window.GeoMaster.config;

function normalizeAnswer(value) {
  return value.trim().toLowerCase();
}

function getCountryBucketIndex(country, difficultyBuckets) {
  const normalizedCountry = normalizeAnswer(country);

  return DIFFICULTY_BUCKET_KEYS.findIndex((bucketKey) => {
    return difficultyBuckets[bucketKey]?.some((candidate) => normalizeAnswer(candidate) === normalizedCountry);
  });
}

function getAllowedBucketIndexes(difficulty) {
  const recipe = DIFFICULTY_RECIPES[difficulty] || DIFFICULTY_RECIPES.normal;

  return recipe
    .map((count, index) => (count > 0 ? index : null))
    .filter((index) => index !== null);
}

function getNearbyAllowedBucketIndexes(country, difficulty, difficultyBuckets) {
  const countryBucketIndex = getCountryBucketIndex(country, difficultyBuckets);
  const allowedBucketIndexes = getAllowedBucketIndexes(difficulty);

  if (countryBucketIndex === -1) {
    return allowedBucketIndexes;
  }

  const nearbyBucketIndexes = [
    countryBucketIndex - 1,
    countryBucketIndex,
    countryBucketIndex + 1,
  ];
  const nearbyAllowedBucketIndexes = nearbyBucketIndexes.filter((index) => allowedBucketIndexes.includes(index));

  return nearbyAllowedBucketIndexes.length ? nearbyAllowedBucketIndexes : allowedBucketIndexes;
}

function getCountriesFromBuckets(bucketIndexes, difficultyBuckets) {
  return bucketIndexes.flatMap((index) => difficultyBuckets[DIFFICULTY_BUCKET_KEYS[index]] || []);
}

function appendUniqueCountry(list, seenCountries, country) {
  const key = normalizeAnswer(country);

  if (seenCountries.has(key)) {
    return;
  }

  seenCountries.add(key);
  list.push(country);
}

function buildCountryChoices({
  country,
  countryNames,
  difficulty,
  difficultyBuckets,
  roundIndex,
  seed,
  shuffleWithSeed,
}, choiceCount = 4) {
  const correctKey = normalizeAnswer(country);
  const seenCountries = new Set([correctKey]);
  const distractors = [];
  const nearbyBucketIndexes = getNearbyAllowedBucketIndexes(country, difficulty, difficultyBuckets);
  const allowedBucketIndexes = getAllowedBucketIndexes(difficulty);
  const candidatePools = [
    getCountriesFromBuckets(nearbyBucketIndexes, difficultyBuckets),
    getCountriesFromBuckets(allowedBucketIndexes, difficultyBuckets),
    countryNames,
  ];

  candidatePools.forEach((pool, poolIndex) => {
    if (distractors.length >= choiceCount - 1) {
      return;
    }

    shuffleWithSeed(pool, Number(seed) + (roundIndex * 97) + poolIndex).forEach((candidate) => {
      if (distractors.length >= choiceCount - 1 || normalizeAnswer(candidate) === correctKey) {
        return;
      }

      appendUniqueCountry(distractors, seenCountries, candidate);
    });
  });

  return shuffleWithSeed([country, ...distractors], Number(seed) + (roundIndex * 131));
}

const SELECT_COUNTRY_MODE = {
  id: "select-country",
  label: "Select Correct One",
  description: "Choose the matching country from polished answer cards.",
  prompt: "Select the correct country",
  inputKind: "choice",
  icon: "assets/selection.svg",
  primaryActionLabel: "Select",
  choiceCount: 4,
  roundTimeLimit: 10,
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
  description: "Name the zoomed country before the hint fills in.",
  prompt: "Guess the country",
  inputKind: "text",
  icon: "assets/typing.svg",
  primaryActionLabel: "Guess",
  usesHints: true,
  isCorrect({ guess, country }) {
    return normalizeAnswer(guess) === normalizeAnswer(country);
  },
};

const MAP_CLICK_COUNTRY_MODE = {
  id: "map-click-country",
  label: "Click On Map",
  description: "Find the named country directly on the zoomed map.",
  prompt: "Click the country on the map",
  inputKind: "map-click",
  icon: "assets/cursor.svg",
  primaryActionLabel: "Click",
  roundTimeLimit: 10,
  usesHints: false,
  revealTargetOnZoom: false,
  showTinyMarker: false,
  isCorrect({ guess, country }) {
    return normalizeAnswer(guess) === normalizeAnswer(country);
  },
};

const modes = [SELECT_COUNTRY_MODE, MAP_CLICK_COUNTRY_MODE, TYPED_COUNTRY_MODE];
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
