const { execSync } = require("child_process");

function run(command, label) {
  try {
    console.log(`\n[verify:migrations] ${label}`);
    const output = execSync(command, {
      stdio: "pipe",
      encoding: "utf8",
      env: process.env,
    });
    if (output && output.trim().length > 0) {
      console.log(output.trim());
    }
    return true;
  } catch (error) {
    console.error(`\n[verify:migrations] Failed: ${label}`);
    if (error.stdout) {
      console.error(String(error.stdout).trim());
    }
    if (error.stderr) {
      console.error(String(error.stderr).trim());
    } else if (error.message) {
      console.error(error.message);
    }
    return false;
  }
}

function main() {
  const okValidate = run("npx prisma validate", "Prisma schema validation");
  const okStatus = run(
    "npx prisma migrate status --schema prisma/schema.prisma",
    "Prisma migration status"
  );

  if (!okValidate || !okStatus) {
    console.error(
      "\n[verify:migrations] Migration verification failed. Check DATABASE_URL and migration/apply state."
    );
    process.exit(1);
  }

  console.log("\n[verify:migrations] Migration verification passed.");
}

main();
