(function () {
window.GeoMaster = window.GeoMaster || {};

function createSound(path, volume) {
  const audio = new Audio(path);
  audio.preload = "auto";
  audio.volume = volume;
  return audio;
}

const sounds = {
  correctAnswer: createSound("assets/sound_effects/correct-answer.mp3", 0.46),
  gameEnd: createSound("assets/sound_effects/game-end-sound.mp3", 0.5),
  timerTick: createSound("assets/sound_effects/single-tick-sound.mp3", 0.34),
  timerTimeout: createSound("assets/sound_effects/countdown-end.mp3", 0.5),
  wrongAnswer: createSound("assets/sound_effects/wrong-answer.mp3", 0.46),
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
