(function () {
window.GeoMaster = window.GeoMaster || {};

const FIXED_COUNTRY_COUNT = 10;
const ROUND_POINTS = 10;

const DIFFICULTY_RECIPES = {
  easy: [3, 2, 0, 0, 0],
  normal: [1, 3, 1, 0, 0],
  hard: [0, 2, 2, 1, 0],
  expert: [0, 1, 1, 2, 1],
  impossible: [0, 0, 0, 2, 3],
};

const DIFFICULTY_BUCKET_KEYS = ["diff1", "diff2", "diff3", "diff4", "diff5"];

const DISTRIBUTION_TIERS = [
  { label: "Famous", color: "#79d891" },
  { label: "Known", color: "#6db7ff" },
  { label: "Tricky", color: "#f2c94c" },
  { label: "Rare", color: "#f2994a" },
  { label: "Obscure", color: "#eb5757" },
];

window.GeoMaster.config = {
  FIXED_COUNTRY_COUNT,
  ROUND_POINTS,
  DIFFICULTY_RECIPES,
  DIFFICULTY_BUCKET_KEYS,
  DISTRIBUTION_TIERS,
};
})();
