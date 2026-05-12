(function () {
window.GeoMaster = window.GeoMaster || {};

function createSeededRandom(seed) {
  let value = Math.abs(Number(seed) || Date.now()) % 2147483647;

  if (value === 0) {
    value = 1;
  }

  return function nextRandom() {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function shuffleWithSeed(items, seed) {
  const random = createSeededRandom(seed);
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function generateSeed() {
  return Math.floor(1000000000 + Math.random() * 9000000000);
}

window.GeoMaster.random = {
  createSeededRandom,
  shuffleWithSeed,
  generateSeed,
};
})();
