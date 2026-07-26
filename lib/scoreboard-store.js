(function () {
window.GeoMaster = window.GeoMaster || {};

const STORAGE_KEY = "geo-master-scoreboard-v1";
const MAX_ENTRIES = 5;
const MODE_ALIASES = {
  "multiple-choice": ["select-country"],
};
const DIFFICULTY_RANK = {
  easy: 1,
  normal: 2,
  hard: 3,
  expert: 4,
  impossible: 5,
};

function readScores() {
  try {
    const scores = JSON.parse(window.localStorage.getItem(STORAGE_KEY));

    return scores && typeof scores === "object" && !Array.isArray(scores) ? scores : {};
  } catch {
    return {};
  }
}

function writeScores(scores) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
  } catch {
    // Storage can be unavailable in private browsing or blocked by browser policy.
  }
}

function normalizeEntry(entry) {
  if (!entry || typeof entry !== "object") {
    return null;
  }

  const difficulty = typeof entry.difficulty === "string" ? entry.difficulty : "";
  const maxScore = Number(entry.maxScore);
  const playedAt = new Date(entry.playedAt);
  const score = Number(entry.score);

  if (
    !Object.hasOwn(DIFFICULTY_RANK, difficulty)
    || !Number.isFinite(maxScore)
    || maxScore <= 0
    || !Number.isFinite(score)
    || score < 0
    || score > maxScore
    || Number.isNaN(playedAt.getTime())
  ) {
    return null;
  }

  return {
    difficulty,
    maxScore,
    playedAt: playedAt.toISOString(),
    score,
  };
}

function getEntries(scores, key) {
  return Array.isArray(scores[key]) ? scores[key].map(normalizeEntry).filter(Boolean) : [];
}

function sortEntries(entries) {
  return entries
    .slice()
    .sort((first, second) => {
      if (second.score !== first.score) {
        return second.score - first.score;
      }

      const difficultyDelta = (DIFFICULTY_RANK[second.difficulty] || 0) - (DIFFICULTY_RANK[first.difficulty] || 0);

      if (difficultyDelta) {
        return difficultyDelta;
      }

      return new Date(second.playedAt).getTime() - new Date(first.playedAt).getTime();
    })
    .slice(0, MAX_ENTRIES);
}

function getTopScores(modeId) {
  const scores = readScores();
  const aliases = MODE_ALIASES[modeId] || [];
  const entries = [modeId, ...aliases].flatMap((key) => getEntries(scores, key));

  return sortEntries(entries);
}

function addScore(modeId, result) {
  const scores = readScores();
  const aliases = MODE_ALIASES[modeId] || [];
  const entry = normalizeEntry({
    difficulty: result.difficulty,
    maxScore: result.maxScore,
    playedAt: new Date().toISOString(),
    score: result.score,
  });

  if (!entry) {
    throw new TypeError("Cannot save an invalid score.");
  }

  scores[modeId] = sortEntries([
    ...getEntries(scores, modeId),
    ...aliases.flatMap((key) => getEntries(scores, key)),
    entry,
  ]);
  aliases.forEach((key) => {
    delete scores[key];
  });
  writeScores(scores);
  return entry;
}

function clearScores() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Clearing an unavailable storage backend should still leave the app usable.
  }
}

window.GeoMaster.scoreboardStore = {
  addScore,
  clearScores,
  getTopScores,
};
})();
