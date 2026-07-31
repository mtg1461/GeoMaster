import { readdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const roots = process.argv.length > 2
  ? process.argv.slice(2).map((entry) => path.resolve(projectRoot, entry))
  : [path.join(projectRoot, "lib")];

async function findJavaScriptFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findJavaScriptFiles(absolutePath));
    } else if (entry.isFile() && /\.(?:c|m)?js$/u.test(entry.name)) {
      files.push(absolutePath);
    }
  }

  return files;
}

const files = (await Promise.all(roots.map(findJavaScriptFiles)))
  .flat()
  .sort((left, right) => left.localeCompare(right));

if (!files.length) {
  console.error("No JavaScript files found.");
  process.exitCode = 1;
} else {
  for (const file of files) {
    const relativePath = path.relative(projectRoot, file);
    const result = spawnSync(process.execPath, ["--check", file], {
      encoding: "utf8",
      stdio: "pipe",
    });

    if (result.status === 0) {
      console.log(`ok ${relativePath}`);
      continue;
    }

    process.exitCode = 1;
    console.error(`not ok ${relativePath}`);
    process.stderr.write(result.stderr || result.stdout || "Syntax check failed.\n");
  }
}
