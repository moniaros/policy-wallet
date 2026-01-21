const path = require('path');
const fs = require('fs');

const cwd = process.cwd();
const relativeUrl = "/uploads/policies/test.pdf";
const joined = path.join(cwd, "public", relativeUrl);

console.log("CWD:", cwd);
console.log("Relative URL:", relativeUrl);
console.log("Joined Path:", joined);

// Check if we can write/read to this path structure
const testDir = path.join(cwd, "public", "uploads", "policies");
if (!fs.existsSync(testDir)) {
    console.log("Creating test dir:", testDir);
    fs.mkdirSync(testDir, { recursive: true });
}

const testFile = path.join(testDir, "test.pdf");
fs.writeFileSync(testFile, "dummy content");
console.log("Wrote test file to:", testFile);

const readPath = path.join(cwd, "public", "/uploads/policies/test.pdf");
console.log("Trying to read from:", readPath);
try {
    const data = fs.readFileSync(readPath);
    console.log("Read success, length:", data.length);
} catch (e) {
    console.log("Read failed:", e.message);
}
