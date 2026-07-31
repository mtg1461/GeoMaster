import { createHash } from 'node:crypto';
import { readFile, readdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const assetRoot = join(projectRoot, 'assets', 'flags');
const EXPECTED_COUNTRY_COUNT = 220;
const EXPECTED_PACKAGE_VERSION = '1.6.20';
const EXPECTED_PACKAGE_COMMIT = '3b8ea50f08ab9d5e79c90325ff76606a4258a719';
const EXPECTED_PACKAGE_INTEGRITY =
  'sha512-py8JiEKzjhYw6HPJ0L7SxLgCYim36UPRTZX43/kqGueUCZLSvnrqAiwW8HtQibur7mdkFQUkjOgdK+o/9FBtaw==';
const EXPECTED_SPECIAL_CODES = Object.freeze({
  'Canary Islands (Spain)': 'IC',
  'Kosovo': 'XK',
  'Saba (Netherlands)': 'BQ-SA',
  'St. Eustatius (Netherlands)': 'BQ-SE',
});
const EXPECTED_OVERRIDE_SHA1 = Object.freeze({
  'Guadeloupe': 'bb2645e2ba2a59656157f8f0f53d213e66b47568',
  'Reunion': '24f4e4bfe47d7af1115fdab410093875ed072536',
});

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function loadBrowserModules() {
  const context = vm.createContext({ window: {} });
  for (const relativePath of ['lib/countries.js', 'lib/country-flags.js']) {
    const absolutePath = join(projectRoot, relativePath);
    const source = await readFile(absolutePath, 'utf8');
    vm.runInContext(source, context, { filename: absolutePath });
  }
  return context.window.GeoMaster;
}

function hash(buffer, algorithm) {
  return createHash(algorithm).update(buffer).digest('hex');
}

function validateSvg(country, filePath, contents) {
  const text = contents.toString('utf8');
  assert(contents.length > 0, `${country}: SVG is empty`);
  assert(contents.length <= 128 * 1024, `${country}: SVG exceeds the 128 KiB safety limit`);
  assert(/<svg\b/i.test(text), `${country}: asset is not an SVG document`);
  assert(/\bviewBox\s*=/i.test(text), `${country}: SVG is missing a viewBox`);

  const forbiddenPatterns = [
    [/<script\b/i, 'script element'],
    [/<foreignObject\b/i, 'foreignObject element'],
    [/<!doctype\b/i, 'DOCTYPE declaration'],
    [/<!entity\b/i, 'entity declaration'],
    [/\son[a-z]+\s*=/i, 'inline event handler'],
    [/\bjavascript\s*:/i, 'javascript URL'],
    [/\bdata\s*:\s*text\/html/i, 'HTML data URL'],
    [/\b(?:href|xlink:href)\s*=\s*["'](?!#)/i, 'external resource reference'],
    [/\burl\s*\(\s*["']?(?:https?:|\/\/|data:)/i, 'external CSS resource'],
  ];

  for (const [pattern, label] of forbiddenPatterns) {
    assert(!pattern.test(text), `${country}: ${filePath} contains a forbidden ${label}`);
  }
}

const geoMaster = await loadBrowserModules();
const countryNames = geoMaster.countries.countryNames;
const countryFlags = geoMaster.countryFlags;
const records = countryFlags.flagsByCountry;
const mappedCountries = Object.keys(records);

assert(countryNames.length === EXPECTED_COUNTRY_COUNT, `Expected ${EXPECTED_COUNTRY_COUNT} countries`);
assert(new Set(countryNames).size === EXPECTED_COUNTRY_COUNT, 'Canonical country names contain duplicates');
assert(mappedCountries.length === EXPECTED_COUNTRY_COUNT, 'Flag mapping does not contain 220 entries');

const missingCountries = countryNames.filter((country) => !records[country]);
const orphanCountries = mappedCountries.filter((country) => !countryNames.includes(country));
assert(missingCountries.length === 0, `Missing flag mappings: ${missingCountries.join(', ')}`);
assert(orphanCountries.length === 0, `Unknown flag mappings: ${orphanCountries.join(', ')}`);
assert(countryFlags.getFlag('__unknown_country__') === null, 'Unknown countries must resolve to null');

for (const [country, expectedCode] of Object.entries(EXPECTED_SPECIAL_CODES)) {
  assert(records[country].code === expectedCode, `${country} must use ${expectedCode}`);
}

const packageJson = JSON.parse(await readFile(join(projectRoot, 'package.json'), 'utf8'));
const packageLock = JSON.parse(await readFile(join(projectRoot, 'package-lock.json'), 'utf8'));
const lockedPackage = packageLock.packages?.['node_modules/country-flag-icons'];
assert(
  packageJson.devDependencies?.['country-flag-icons'] === EXPECTED_PACKAGE_VERSION,
  'country-flag-icons must be pinned exactly in package.json',
);
assert(lockedPackage?.version === EXPECTED_PACKAGE_VERSION, 'package-lock version is not pinned');
assert(lockedPackage?.integrity === EXPECTED_PACKAGE_INTEGRITY, 'package-lock integrity does not match');

const baseSource = countryFlags.sources['country-flag-icons'];
assert(baseSource.version === EXPECTED_PACKAGE_VERSION, 'Runtime source version metadata is incorrect');
assert(baseSource.commit === EXPECTED_PACKAGE_COMMIT, 'Runtime source commit metadata is incorrect');
assert(baseSource.integrity === EXPECTED_PACKAGE_INTEGRITY, 'Runtime source integrity metadata is incorrect');
assert(baseSource.license === 'MIT', 'Runtime source license metadata is incorrect');
assert(
  baseSource.repository === 'https://gitlab.com/catamphetamine/country-flag-icons',
  'Runtime source repository metadata is incorrect',
);

const expectedAssetNames = new Set();
const visualIds = new Set();
const hashesToCountries = new Map();
const packageAssetRoot = join(projectRoot, 'node_modules', 'country-flag-icons', '3x2');

for (const country of countryNames) {
  const record = countryFlags.getFlag(country);
  assert(record.country === country, `${country}: record country does not match its key`);
  assert(/^[A-Z]{2}(?:-[A-Z]{2})?$/.test(record.code), `${country}: invalid asset code ${record.code}`);
  assert(
    /^assets\/flags\/[a-z0-9-]+\.svg$/.test(record.src),
    `${country}: source must be a lowercase repo-relative SVG path`,
  );

  const expectedSrc = `assets/flags/${record.code.toLowerCase()}.svg`;
  assert(record.src === expectedSrc, `${country}: ${record.src} does not match code ${record.code}`);
  assert(!visualIds.has(record.visualId), `${country}: duplicate visualId ${record.visualId}`);
  visualIds.add(record.visualId);
  expectedAssetNames.add(`${record.code.toLowerCase()}.svg`);

  const assetPath = resolve(projectRoot, record.src);
  assert(dirname(assetPath) === assetRoot, `${country}: asset path escapes assets/flags`);
  const assetInfo = await stat(assetPath);
  assert(assetInfo.isFile(), `${country}: asset is not a regular file`);
  const contents = await readFile(assetPath);
  validateSvg(country, assetPath, contents);

  const assetHash = hash(contents, 'sha256');
  const matchingCountries = hashesToCountries.get(assetHash) || [];
  matchingCountries.push(country);
  hashesToCountries.set(assetHash, matchingCountries);

  if (record.sourceId === 'country-flag-icons') {
    const packageContents = await readFile(join(packageAssetRoot, `${record.code}.svg`));
    assert(
      contents.equals(packageContents),
      `${country}: vendored SVG differs from country-flag-icons ${EXPECTED_PACKAGE_VERSION}`,
    );
    assert(record.statusLabel === null, `${country}: base assets must not have a status label`);
    assert(record.statusDescription === null, `${country}: base assets must not have a status description`);
  } else {
    const expectedSha1 = EXPECTED_OVERRIDE_SHA1[country];
    assert(expectedSha1, `${country}: undeclared flag override`);
    assert(hash(contents, 'sha1') === expectedSha1, `${country}: override differs from its pinned source`);
    assert(
      record.statusLabel === 'Local/unofficial flag',
      `${country}: override status label is missing`,
    );
    assert(
      record.statusDescription ===
        'Local/unofficial flag; official flag is France\u2019s tricolour.',
      `${country}: override status description is missing`,
    );
    assert(countryFlags.sources[record.sourceId], `${country}: override source metadata is missing`);
  }
}

const duplicateArtwork = [...hashesToCountries.values()].filter((countries) => countries.length > 1);
assert(
  duplicateArtwork.length === 0,
  `Exact duplicate flag artwork found: ${duplicateArtwork.map((group) => group.join(' / ')).join('; ')}`,
);

const actualAssetNames = (await readdir(assetRoot))
  .filter((fileName) => fileName.toLowerCase().endsWith('.svg'));
const unexpectedAssets = actualAssetNames.filter((fileName) => !expectedAssetNames.has(fileName));
const missingAssets = [...expectedAssetNames].filter((fileName) => !actualAssetNames.includes(fileName));
assert(unexpectedAssets.length === 0, `Unexpected flag assets: ${unexpectedAssets.join(', ')}`);
assert(missingAssets.length === 0, `Missing flag assets: ${missingAssets.join(', ')}`);
assert(actualAssetNames.length === EXPECTED_COUNTRY_COUNT, 'Flag asset directory must contain 220 SVGs');

const notices = await readFile(join(projectRoot, 'THIRD_PARTY_NOTICES.md'), 'utf8');
for (const requiredText of [
  'country-flag-icons 1.6.20',
  'https://gitlab.com/catamphetamine/country-flag-icons',
  EXPECTED_PACKAGE_COMMIT,
  EXPECTED_PACKAGE_INTEGRITY,
  'Unofficial flag of Guadeloupe (local)',
  EXPECTED_OVERRIDE_SHA1.Guadeloupe,
  'Proposed flag of R\u00e9union (VAR)',
  EXPECTED_OVERRIDE_SHA1.Reunion,
]) {
  assert(notices.includes(requiredText), `THIRD_PARTY_NOTICES.md is missing: ${requiredText}`);
}

console.log(
  `Verified ${countryNames.length} country mappings, ${actualAssetNames.length} local SVGs, ` +
  '2 public-domain overrides, and pinned source provenance.',
);
