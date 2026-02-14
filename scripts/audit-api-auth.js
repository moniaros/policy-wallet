const fs = require("fs");
const path = require("path");

const ROUTES_ROOT = path.join(process.cwd(), "app", "api", "v1");
const EXPECTED_PUBLIC_ROUTES = new Set([
  "auth/magic-link/request/route.ts",
  "billing/revenuecat-webhook/route.ts",
  "billing/webhook/route.ts",
]);

function getRouteFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...getRouteFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name === "route.ts") {
      files.push(fullPath);
    }
  }

  return files;
}

function normalizeRelative(filePath) {
  return path.relative(ROUTES_ROOT, filePath).replace(/\\/g, "/");
}

function main() {
  if (!fs.existsSync(ROUTES_ROOT)) {
    console.error("API routes directory not found:", ROUTES_ROOT);
    process.exit(1);
  }

  const routeFiles = getRouteFiles(ROUTES_ROOT);
  const missingAuth = [];
  const unexpectedPublic = [];
  const publicRoutes = [];
  let protectedCount = 0;

  for (const file of routeFiles) {
    const rel = normalizeRelative(file);
    const content = fs.readFileSync(file, "utf8");
    const hasRequireApiUser = /requireApiUser\s*\(/.test(content);
    const hasPublicMarker = /PUBLIC_ENDPOINT_AUTH_STRATEGY:\s*.+/.test(content);

    if (hasRequireApiUser) {
      protectedCount += 1;
    }

    if (!hasRequireApiUser && !hasPublicMarker) {
      missingAuth.push(rel);
      continue;
    }

    if (!hasRequireApiUser && hasPublicMarker) {
      publicRoutes.push(rel);
      if (!EXPECTED_PUBLIC_ROUTES.has(rel)) {
        unexpectedPublic.push(rel);
      }
    }
  }

  const missingExpectedPublic = [...EXPECTED_PUBLIC_ROUTES].filter(
    (route) => !publicRoutes.includes(route)
  );

  console.log("API Auth Audit Summary");
  console.log(`- total routes: ${routeFiles.length}`);
  console.log(`- protected via requireApiUser: ${protectedCount}`);
  console.log(`- marked intentional public routes: ${publicRoutes.length}`);

  if (missingAuth.length > 0) {
    console.error("\nRoutes missing auth strategy:");
    for (const rel of missingAuth) {
      console.error(`- ${rel}`);
    }
  }

  if (unexpectedPublic.length > 0) {
    console.error("\nUnexpected public routes (not in approved allowlist):");
    for (const rel of unexpectedPublic) {
      console.error(`- ${rel}`);
    }
  }

  if (missingExpectedPublic.length > 0) {
    console.error("\nExpected public routes missing marker:");
    for (const rel of missingExpectedPublic) {
      console.error(`- ${rel}`);
    }
  }

  if (
    missingAuth.length > 0 ||
    unexpectedPublic.length > 0 ||
    missingExpectedPublic.length > 0
  ) {
    process.exit(1);
  }

  console.log("\nAPI auth audit passed.");
}

main();
