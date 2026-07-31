const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const { loadBrowserScripts, projectRoot } = require("./helpers/browser-harness");

function loadFlagData() {
  return loadBrowserScripts([
    "lib/countries.js",
    "lib/country-flags.js",
  ]).window.GeoMaster;
}

test("every map country has local flag metadata and an SVG asset", () => {
  const { countries, countryFlags } = loadFlagData();
  const names = Array.from(countries.countryNames);

  assert.equal(names.length, 220);
  assert.equal(new Set(names).size, 220);
  assert.equal(Object.keys(countryFlags.flagsByCountry).length, names.length);

  for (const country of names) {
    const metadata = countryFlags.getFlag(country);

    assert.ok(metadata, `missing flag metadata for ${country}`);
    assert.equal(metadata.country, country);
    assert.match(metadata.code, /^[A-Z0-9-]+$/u, `invalid code for ${country}`);
    assert.equal(typeof metadata.visualId, "string");
    assert.ok(metadata.visualId, `missing visualId for ${country}`);
    assert.equal(typeof metadata.sourceId, "string");
    assert.ok(countryFlags.sources[metadata.sourceId], `unknown sourceId for ${country}`);
    assert.match(metadata.src, /^assets\/flags\/[a-z0-9-]+\.svg$/u);
    assert.ok(!metadata.src.includes("\\"), `non-portable asset path for ${country}`);

    const absolutePath = path.resolve(projectRoot, metadata.src);
    const flagsRoot = path.resolve(projectRoot, "assets", "flags");
    assert.ok(
      absolutePath.startsWith(`${flagsRoot}${path.sep}`),
      `asset escapes the flags directory for ${country}`,
    );
    assert.ok(fs.existsSync(absolutePath), `missing ${metadata.src} for ${country}`);

    const svg = fs.readFileSync(absolutePath, "utf8");
    assert.match(svg, /<svg\b/iu, `${metadata.src} is not SVG`);
    assert.doesNotMatch(svg, /<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["']https?:/iu);
  }
});

test("unknown countries do not resolve and local overrides are disclosed", () => {
  const { countryFlags } = loadFlagData();

  assert.equal(countryFlags.getFlag("Atlantis"), null);

  for (const country of ["Guadeloupe", "Reunion"]) {
    const metadata = countryFlags.getFlag(country);

    assert.equal(metadata.statusLabel, "Local/unofficial flag");
    assert.match(metadata.statusDescription, /official flag is France\u2019s tricolour/u);
    assert.notEqual(metadata.sourceId, "country-flag-icons");
  }

  const notices = fs.readFileSync(path.join(projectRoot, "THIRD_PARTY_NOTICES.md"), "utf8");
  assert.match(notices, /country-flag-icons/iu);
  assert.match(notices, /Guadeloupe/iu);
  assert.match(notices, /R[ée]union/iu);
});
