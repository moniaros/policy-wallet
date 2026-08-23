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
      continue;
    }

    // A raw NUL byte is VALID UTF-8 (U+0000), so the decode above accepts it —
    // but grep, ripgrep and git treat a file containing one as BINARY and skip
    // it silently. A source file invisible to every command-line text tool is a
    // hole under every grep-based guard in this repo. Found in
    // lib/notifications/preference-channels.ts, where a composite-key delimiter
    // had been written as a literal NUL instead of the `\u0000` escape; the
    // escape is behaviourally identical and keeps the file plain text.
    const nul = bytes.indexOf(0);
    if (nul !== -1) {
      const line = bytes.subarray(0, nul).toString("utf8").split("\n").length;
      invalid.push({
        filePath,
        error:
          `raw NUL byte at offset ${nul} (line ${line}) — valid UTF-8, but this file is ` +
          `BINARY to grep/ripgrep and invisible to text-based tooling. Write the escape ` +
          `\\u0000 instead of a literal NUL.`,
      });
    }
  }

  if (invalid.length > 0) {
    console.error("Encoding problems detected (invalid UTF-8, or a raw NUL that hides the file from grep):");
    for (const issue of invalid) {
      console.error(`- ${issue.filePath}: ${issue.error}`);
    }
    process.exit(1);
  }

  console.log(`UTF-8 check passed for ${candidates.length} tracked source/config files.`);
}

main();
