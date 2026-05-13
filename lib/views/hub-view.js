(function () {
window.GeoMaster = window.GeoMaster || {};
window.GeoMaster.views = window.GeoMaster.views || {};

class HubView {
  constructor({ elements, modes, onSelectMode }) {
    this.elements = elements;
    this.modes = modes;
    this.onSelectMode = onSelectMode;
  }

  render() {
    this.elements.modeOptions.replaceChildren();

    this.modes.forEach((mode) => {
      const button = document.createElement("button");
      const body = document.createElement("span");
      const iconWrap = document.createElement("span");
      const icon = document.createElement("img");
      const copy = document.createElement("span");
      const name = document.createElement("span");
      const note = document.createElement("span");
      const arrow = document.createElement("span");

      button.className = "mode-card primary-button-sound";
      button.type = "button";
      button.dataset.modeId = mode.id;
      body.className = "mode-card-body";
      iconWrap.className = "mode-icon-wrap";
      icon.className = "mode-icon";
      icon.src = mode.icon;
      icon.alt = "";
      icon.setAttribute("aria-hidden", "true");
      copy.className = "mode-copy";
      name.className = "mode-name";
      name.textContent = mode.label;
      note.className = "mode-note";
      note.textContent = mode.description;
      arrow.className = "mode-arrow";
      arrow.setAttribute("aria-hidden", "true");

      iconWrap.appendChild(icon);
      copy.append(name, note);
      body.append(iconWrap, copy, arrow);
      button.appendChild(body);
      button.addEventListener("click", () => this.onSelectMode(mode.id));
      this.elements.modeOptions.appendChild(button);
    });
  }

  show() {
    this.elements.startPanel.hidden = false;
  }

  hide() {
    this.elements.startPanel.hidden = true;
  }
}

window.GeoMaster.views.HubView = HubView;
})();
