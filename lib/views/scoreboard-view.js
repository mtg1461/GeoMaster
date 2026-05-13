(function () {
window.GeoMaster = window.GeoMaster || {};
window.GeoMaster.views = window.GeoMaster.views || {};

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatDifficulty(difficulty) {
  return difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
}

class ScoreboardView {
  constructor({ elements, getMode, onBack, store }) {
    this.elements = elements;
    this.getMode = getMode;
    this.store = store;
    this.modeId = null;

    this.elements.backToSetup.addEventListener("click", () => {
      onBack(this.modeId);
    });
  }

  show(modeId, latestEntry = null) {
    const mode = this.getMode(modeId);

    this.modeId = mode.id;
    this.elements.scoreboardModeName.textContent = mode.label;
    this.renderLatest(latestEntry);
    this.renderScores(mode.id);
    this.elements.scoreboardPanel.hidden = false;
  }

  hide() {
    this.elements.scoreboardPanel.hidden = true;
  }

  renderLatest(entry) {
    this.elements.latestScoreSummary.textContent = "";

    if (!entry) {
      this.elements.latestScoreSummary.hidden = true;
      return;
    }

    this.elements.latestScoreSummary.hidden = false;
    this.elements.latestScoreSummary.innerHTML = `
      <span class="latest-score-label">Latest Score</span>
      <span class="latest-score-value">${formatScore(entry.score)}</span>
      <span class="latest-score-max">/ ${formatScore(entry.maxScore)}</span>
      <span class="difficulty-tag">${formatDifficulty(entry.difficulty)}</span>
    `;
  }

  renderScores(modeId) {
    const entries = this.store.getTopScores(modeId);

    this.elements.scoreboardList.textContent = "";

    if (!entries.length) {
      const empty = document.createElement("div");
      empty.className = "scoreboard-empty";
      empty.textContent = "No scores yet";
      this.elements.scoreboardList.appendChild(empty);
      return;
    }

    entries.forEach((entry, index) => {
      const row = document.createElement("div");
      row.className = "scoreboard-row";
      row.innerHTML = `
        <span class="scoreboard-rank">${index + 1}</span>
        <span class="scoreboard-meta">
          <strong>${formatScore(entry.score)} / ${formatScore(entry.maxScore)}</strong>
          <small>${formatDate(entry.playedAt)}</small>
        </span>
        <span class="difficulty-tag">${formatDifficulty(entry.difficulty)}</span>
      `;
      this.elements.scoreboardList.appendChild(row);
    });
  }
}

window.GeoMaster.views.ScoreboardView = ScoreboardView;
})();
