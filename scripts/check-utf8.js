const fs = require("fs");
const { execSync } = require("child_process");

const TARGET_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yml",
  ".yaml",
]);

function getTrackedFiles() {
  const output = execSync("git ls-files", { encoding: "utf8" });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function hasTargetExtension(filePath) {
  const lower = filePath.toLowerCase();
  for (const ext of TARGET_EXTENSIONS) {
    if (lower.endsWith(ext)) return true;
  }
  return false;
}

function main() {
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const candidates = getTrackedFiles().filter(hasTargetExtension);
  const invalid = [];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) {
      continue;
    }
    const bytes = fs.readFileSync(filePath);
    try {
      decoder.decode(bytes);
    } catch (error) {
      invalid.push({
        filePath,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  if (invalid.length > 0) {
    console.error("Invalid UTF-8 files detected:");
    for (const issue of invalid) {
      console.error(`- ${issue.filePath}: ${issue.error}`);
    }
    process.exit(1);
  }

  console.log(`UTF-8 check passed for ${candidates.length} tracked source/config files.`);
}

main();
