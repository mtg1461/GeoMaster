(function () {
window.GeoMaster = window.GeoMaster || {};

const STORAGE_KEY = "geo-master-scoreboard-v1";
const MAX_ENTRIES = 5;
const DIFFICULTY_RANK = {
  easy: 1,
  normal: 2,
  hard: 3,
  expert: 4,
  impossible: 5,
};

function readScores() {
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function writeScores(scores) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
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
  return sortEntries(scores[modeId] || []);
}

function addScore(modeId, result) {
  const scores = readScores();
  const entry = {
    difficulty: result.difficulty,
    maxScore: result.maxScore,
    playedAt: new Date().toISOString(),
    score: result.score,
  };

  scores[modeId] = sortEntries([...(scores[modeId] || []), entry]);
  writeScores(scores);
  return entry;
}

function clearScores() {
  window.localStorage.removeItem(STORAGE_KEY);
}

window.GeoMaster.scoreboardStore = {
  addScore,
  clearScores,
  getTopScores,
};
})();
