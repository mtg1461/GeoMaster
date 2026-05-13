(function () {
window.GeoMaster = window.GeoMaster || {};

function createSound(path, volume) {
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

const sounds = {
  zoomTransition: createSound("assets/sound_effects/zoom-transition.mp3", 0.34),
};

function play(name) {
  const source = sounds[name];

  if (!source) {
    return;
  }

  const sound = source.cloneNode();
  sound.volume = source.volume;
  sound.play().catch(() => {});
}

window.GeoMaster.soundEffects = {
  play,
};
})();
