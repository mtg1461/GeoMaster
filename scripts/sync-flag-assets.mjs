import { access, copyFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const metadataPath = join(projectRoot, 'lib', 'country-flags.js');
const packagePath = join(projectRoot, 'node_modules', 'country-flag-icons', 'package.json');
const packageAssetRoot = join(projectRoot, 'node_modules', 'country-flag-icons', '3x2');
const outputRoot = join(projectRoot, 'assets', 'flags');
const EXPECTED_VERSION = '1.6.20';

async function loadFlagMetadata() {
  const context = vm.createContext({ window: {} });
  const source = await readFile(metadataPath, 'utf8');
  vm.runInContext(source, context, { filename: metadataPath });
  return context.window.GeoMaster.countryFlags;
}

const packageMetadata = JSON.parse(await readFile(packagePath, 'utf8'));
if (packageMetadata.version !== EXPECTED_VERSION) {
  throw new Error(
    `Expected country-flag-icons ${EXPECTED_VERSION}, found ${packageMetadata.version}. Run npm install first.`,
  );
}

const countryFlags = await loadFlagMetadata();
const records = Object.values(countryFlags.flagsByCountry);
await mkdir(outputRoot, { recursive: true });

let copied = 0;
let preservedOverrides = 0;

for (const record of records) {
  if (!/^assets\/flags\/[a-z0-9-]+\.svg$/.test(record.src)) {
    throw new Error(`Unsafe flag output path for ${record.country}: ${record.src}`);
  }

  const outputPath = resolve(projectRoot, record.src);
  if (dirname(outputPath) !== outputRoot) {
    throw new Error(`Flag output escaped ${outputRoot}: ${outputPath}`);
  }

  if (record.sourceId !== 'country-flag-icons') {
    await access(outputPath);
    preservedOverrides += 1;
    continue;
  }

  const sourcePath = join(packageAssetRoot, `${record.code}.svg`);
  await copyFile(sourcePath, outputPath);
  copied += 1;
}

console.log(
  `Synced ${copied} country-flag-icons SVGs and preserved ${preservedOverrides} curated overrides.`,
);
