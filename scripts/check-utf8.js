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

    // OTHER C0 CONTROL BYTES. The NUL check above exists because a literal NUL
    // delimiter once shipped; it made grep treat the file as binary, so it was
    // caught. Its quieter siblings were not: 0x01, 0x02 and the rest of C0 are
    // valid UTF-8, do NOT make a file binary to grep, and slipped straight
    // through both `lint:utf8` and `lint:encoding`.
    //
    // Not hypothetical. Two agents wrote literal control bytes as composite-key
    // delimiters under tests/measure/ on 2026-08-27 — once as NUL (caught here,
    // loudly) and once as 0x01/0x02 (caught by nothing, found only by a
    // byte-level self-check). A delimiter is exactly the use that tempts the
    // raw byte, and the escape is behaviourally identical.
    //
    // Tab, newline and carriage return are legitimate; the rest of C0 and DEL
    // are refused.
    for (let i = 0; i < bytes.length; i++) {
      const b = bytes[i];
      if (b === 0x00) continue; // reported above with its own message
      if ((b < 0x20 && b !== 0x09 && b !== 0x0a && b !== 0x0d) || b === 0x7f) {
        const line = bytes.subarray(0, i).toString("utf8").split("\n").length;
        invalid.push({
          filePath,
          error:
            `raw control byte 0x${b.toString(16).padStart(2, "0")} at offset ${i} (line ${line}) — ` +
            `valid UTF-8 and invisible on screen, so nothing else in this repo refuses it. ` +
            `Write the \\u00XX escape instead of the literal byte.`,
        });
        break;
      }
    }

    // Zero-width and invisible formatting characters. Same family as the NUL
    // above: valid UTF-8, and unreadable. This one is not hypothetical — I put
    // a ZERO WIDTH SPACE inside a block comment so that `/wallet/*<zwsp>/review`
    // would not terminate the comment at `*/`, committed it, and shipped a
    // lint-red HEAD; ESLint's no-irregular-whitespace caught it afterwards, but
    // only because the file happened to be TypeScript. A .md, .css or .json
    // carrying the same character has no such net.
    //
    // Evidence JSON legitimately contains NBSP — it is captured page text — so
    // NBSP is not in this set and docs/**/evidence data is not scanned for it.
    const INVISIBLES = [
      [0x200b, "ZERO WIDTH SPACE"],
      [0x200c, "ZERO WIDTH NON-JOINER"],
      [0x200d, "ZERO WIDTH JOINER"],
      [0x2060, "WORD JOINER"],
      [0xfeff, "ZERO WIDTH NO-BREAK SPACE (BOM)"],
    ];
    const text = bytes.toString("utf8");
    for (const [code, name] of INVISIBLES) {
      const ch = String.fromCharCode(code);
      // A BOM at position 0 is a legitimate byte-order mark, not a stray.
      const at = code === 0xfeff ? text.indexOf(ch, 1) : text.indexOf(ch);
      if (at !== -1) {
        const line = text.slice(0, at).split("\n").length;
        invalid.push({
          filePath,
          error:
            `${name} (U+${code.toString(16).toUpperCase().padStart(4, "0")}) at line ${line} — ` +
            `valid UTF-8 and INVISIBLE in an editor and a diff. If it is standing in for a ` +
            `character that would break syntax, restructure instead: an invisible fix is a ` +
            `defect the next reader cannot see.`,
        });
      }
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
