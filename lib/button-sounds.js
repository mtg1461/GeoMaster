(function () {
window.GeoMaster = window.GeoMaster || {};

const SOUND_PATHS = {
  accentClick: "assets/sound_effects/accent-button-click.mp3",
  click: "assets/sound_effects/button-click.mp3",
  hover: "assets/sound_effects/button-hover.mp3",
  secondaryClick: "assets/sound_effects/secondary-button-click.mp3",
};
const VOLUME = {
  accentClick: 0.32,
  click: 0.32,
  hover: 0.18,
  secondaryClick: 0.3,
};

function createSound(path, volume) {
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

class ButtonSounds {
  constructor(root = document) {
    this.root = root;
    this.sounds = {
      accentClick: createSound(SOUND_PATHS.accentClick, VOLUME.accentClick),
      click: createSound(SOUND_PATHS.click, VOLUME.click),
      hover: createSound(SOUND_PATHS.hover, VOLUME.hover),
      secondaryClick: createSound(SOUND_PATHS.secondaryClick, VOLUME.secondaryClick),
    };
  }

  start() {
    this.root.addEventListener("pointerover", (event) => this.handleHover(event));
    this.root.addEventListener("click", (event) => this.handleClick(event), true);
  }

  handleHover(event) {
    const button = this.getSoundControl(event.target);

    if (!button || button.contains(event.relatedTarget)) {
      return;
    }

    this.play("hover");
  }

  handleClick(event) {
    const button = this.getSoundControl(event.target);

    if (!button) {
      return;
    }

    this.play(this.getClickSoundName(button));
  }

  getClickSoundName(control) {
    if (control.classList.contains("accent-button-sound")) {
      return "accentClick";
    }

    if (control.classList.contains("secondary-button") || control.classList.contains("secondary-button-sound")) {
      return "secondaryClick";
    }

    return this.isPrimarySoundButton(control) ? "click" : "secondaryClick";
  }

  isPrimarySoundButton(control) {
    return control.classList.contains("primary-button") || control.classList.contains("primary-button-sound");
  }

  getSoundControl(target) {
    const control = target?.closest?.("button, .accent-button-sound");

    if (
      !control
      || control.disabled
      || control.hidden
      || control.getAttribute("aria-disabled") === "true"
      || control.querySelector?.("input:disabled")
    ) {
      return null;
    }

    return control;
  }

  play(name) {
    const source = this.sounds[name];

    if (!source) {
      return;
    }

    const sound = source.cloneNode();
    sound.volume = source.volume;
    sound.play().catch(() => {});
  }
}

window.GeoMaster.buttonSounds = new ButtonSounds();
window.GeoMaster.buttonSounds.start();
})();
