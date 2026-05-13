(function () {
window.GeoMaster = window.GeoMaster || {};
window.GeoMaster.views = window.GeoMaster.views || {};

class SetupView {
  constructor({ elements, config, getMode, onBack, onDifficultyChange }) {
    this.elements = elements;
    this.config = config;
    this.getMode = getMode;
    this.onDifficultyChange = onDifficultyChange;

    this.elements.backToModes.addEventListener("click", onBack);
    this.elements.difficulty.forEach((input) => {
      input.addEventListener("change", () => {
        this.renderDifficultyDistribution();
        this.onDifficultyChange();
      });
    });
  }

  show(modeId) {
    const mode = this.getMode(modeId);

    this.clearDifficultySelection();
    this.elements.setupModeIcon.src = mode.icon;
    this.elements.setupModeName.textContent = mode.label;
    this.elements.modeSetupPanel.hidden = false;
  }

  hide() {
    this.elements.modeSetupPanel.hidden = true;
  }

  getSelectedDifficulty() {
    return [...this.elements.difficulty].find((input) => input.checked)?.value || null;
  }

  clearDifficultySelection() {
    this.elements.difficulty.forEach((input) => {
      input.checked = false;
    });

    this.renderDifficultyDistribution();
  }

  updateStartState(isMapReady) {
    this.elements.start.disabled = !isMapReady || !this.getSelectedDifficulty();
  }

  renderDifficultyDistribution() {
    const selectedDifficulty = this.getSelectedDifficulty();
    const { DIFFICULTY_RECIPES, DISTRIBUTION_TIERS, FIXED_COUNTRY_COUNT } = this.config;

    this.elements.difficultyDistribution.textContent = "";

    if (!selectedDifficulty) {
      this.elements.difficultyDistribution.hidden = true;
      return;
    }

    this.elements.difficultyDistribution.hidden = false;
    const recipe = DIFFICULTY_RECIPES[selectedDifficulty];
    const unit = Math.max(1, Math.floor(FIXED_COUNTRY_COUNT / 5));
    const counts = recipe.map((amount) => amount * unit);
    const total = counts.reduce((sum, amount) => sum + amount, 0);
    let cursor = 0;
    const slices = counts
      .map((count, index) => {
        if (!count) {
          return "";
        }

        const start = cursor;
        cursor += (count / total) * 100;
        return `${DISTRIBUTION_TIERS[index].color} ${start}% ${cursor}%`;
      })
      .filter(Boolean)
      .join(", ");

    const header = document.createElement("div");
    header.className = "distribution-header";
    header.innerHTML = `<span>Question Mix</span><span class="distribution-total">${total} rounds</span>`;

    const body = document.createElement("div");
    body.className = "distribution-body";

    const pie = document.createElement("div");
    pie.className = "pie-chart";
    pie.style.setProperty("--pie-bg", `conic-gradient(${slices})`);
    pie.innerHTML = `<span>${total}</span>`;

    const legend = document.createElement("div");
    legend.className = "distribution-legend";

    counts.forEach((count, index) => {
      const item = document.createElement("div");
      item.className = `legend-item${count === 0 ? " is-empty" : ""}`;
      item.innerHTML = `
        <span class="legend-dot" style="--legend-color: ${DISTRIBUTION_TIERS[index].color}"></span>
        <span>${DISTRIBUTION_TIERS[index].label}</span>
        <strong>${count}</strong>
      `;
      legend.appendChild(item);
    });

    body.append(pie, legend);
    this.elements.difficultyDistribution.append(header, body);
  }
}

window.GeoMaster.views.SetupView = SetupView;
})();
