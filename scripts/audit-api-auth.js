const fs = require("fs");
const path = require("path");

const ROUTES_ROOT = path.join(process.cwd(), "app", "api");
const INVENTORY_PATH = path.join(process.cwd(), "scripts", "api-route-policy-inventory.json");
const HTTP_METHOD_EXPORT_REGEXES = [
  /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\b/g,
  /export\s+const\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*=/g,
];

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

function normalizeRoute(filePath) {
  return path.relative(ROUTES_ROOT, filePath).replace(/\\/g, "/");
}

function readInventory() {
  if (!fs.existsSync(INVENTORY_PATH)) {
    throw new Error(`Inventory not found at ${INVENTORY_PATH}`);
  }

  const raw = fs.readFileSync(INVENTORY_PATH, "utf8");
  const data = JSON.parse(raw);

  if (!Array.isArray(data.routes)) {
    throw new Error("Invalid inventory shape: routes[] is required");
  }

  return data.routes;
}

function extractMethods(content) {
  const methods = new Set();

  for (const regex of HTTP_METHOD_EXPORT_REGEXES) {
    for (const match of content.matchAll(regex)) {
      methods.add(match[1]);
    }
  }

  return [...methods].sort();
}

function sameMethods(a, b) {
  if (a.length !== b.length) return false;
  const aSorted = [...a].sort();
  const bSorted = [...b].sort();
  for (let i = 0; i < aSorted.length; i += 1) {
    if (aSorted[i] !== bSorted[i]) return false;
  }
  return true;
}

function analyzeAuthSignals(content) {
  const withApiGuardPublic = /auth\s*:\s*\{\s*mode\s*:\s*["']public["']/.test(content);
  const withApiGuardUser = /auth\s*:\s*\{\s*mode\s*:\s*["']user["']/.test(content);
  const withApiGuardWebhook = /auth\s*:\s*\{\s*mode\s*:\s*["']webhook["']/.test(content);
  const withApiGuardRole = /auth\s*:\s*\{\s*mode\s*:\s*["']user["'][\s\S]*?roles\s*:/.test(content);

  // authorizeCronRequest (lib/api-auth) wraps CRON_SECRET + requireApiUser
  // with roles ['admin'] — treat it as a role-guarded signal.
  const authorizeCron = /authorizeCronRequest\s*\(/.test(content);
  const requireApiUser = /requireApiUser\s*\(/.test(content) || authorizeCron;
  const requireApiUserRole = /requireApiUser\s*\(\s*\{[\s\S]*?roles\s*:/.test(content) || authorizeCron;

  const authHelpersUser = /getAuthenticatedUserOrNull\s*\(/.test(content);
  const authHelpersRole = /roles\??\s*\.\s*includes\(\s*["'](?:admin|agent|policyholder)["']\s*\)/.test(content);

  const publicMarker = /PUBLIC_ENDPOINT_AUTH_STRATEGY:\s*.+/.test(content);

  return {
    withApiGuardPublic,
    withApiGuardUser,
    withApiGuardWebhook,
    withApiGuardRole,
    requireApiUser,
    requireApiUserRole,
    authHelpersUser,
    authHelpersRole,
    publicMarker,
  };
}

function checkAuthPolicy(route, policy, authSignals, findings) {
  const mode = policy?.auth?.mode;
  const prefix = `${route}:`;

  if (!mode || typeof mode !== "string") {
    findings.push(`${prefix} missing or invalid policy.auth.mode`);
    return;
  }

  if (mode === "public") {
    const hasProtectedGuard =
      authSignals.withApiGuardUser ||
      authSignals.withApiGuardWebhook ||
      authSignals.requireApiUser ||
      authSignals.authHelpersUser;

    if (hasProtectedGuard && !authSignals.withApiGuardPublic) {
      findings.push(`${prefix} inventory declares public but route appears protected`);
    }
    return;
  }

  if (mode === "user") {
    const hasUserGuard =
      authSignals.withApiGuardUser ||
      authSignals.requireApiUser ||
      authSignals.authHelpersUser;

    if (!hasUserGuard) {
      findings.push(`${prefix} missing user auth guard (withApiGuard user / requireApiUser / auth helper)`);
    }
    return;
  }

  if (mode === "role") {
    const hasRoleGuard =
      authSignals.withApiGuardRole ||
      authSignals.requireApiUserRole ||
      authSignals.authHelpersRole;

    if (!hasRoleGuard) {
      findings.push(`${prefix} missing role-based auth guard`);
    }
    return;
  }

  if (mode === "webhook") {
    if (!authSignals.withApiGuardWebhook) {
      findings.push(`${prefix} missing webhook guard (withApiGuard auth.mode="webhook")`);
    }
    return;
  }

  findings.push(`${prefix} unsupported auth mode '${mode}' in inventory`);
}

function checkControlPolicy(route, policy, content, findings) {
  const prefix = `${route}:`;

  if (policy?.rateLimit?.required === true) {
    const hasRateLimit =
      /rateLimit\s*:\s*\{/.test(content) ||
      /\brateLimit\s*\(/.test(content);

    if (!hasRateLimit) {
      findings.push(`${prefix} missing required rate-limit control`);
    }
  } else {
    // Default-deny. Opting a route out of rate limiting is allowed, but it has
    // to be a decision someone made and can be reviewed — not the silent
    // default that left 58 of 95 routes (40 of them mutating) unthrottled,
    // including AI-backed and billing endpoints. `required: false` therefore
    // demands a written justification.
    const justification = policy?.rateLimit?.justification;
    if (typeof justification !== "string" || justification.trim().length < 15) {
      findings.push(
        `${prefix} rateLimit.required is false without a justification (add policy.rateLimit.justification explaining why this route needs no limit)`
      );
    }
  }

  if (policy?.validation?.required === true) {
    const hasValidation =
      /validation\s*:\s*\{/.test(content) ||
      /\.safeParse\s*\(/.test(content);

    if (!hasValidation) {
      findings.push(`${prefix} missing required request validation control`);
    }
  }
}

function main() {
  if (!fs.existsSync(ROUTES_ROOT)) {
    console.error("API routes directory not found:", ROUTES_ROOT);
    process.exit(1);
  }

  const routeFiles = getRouteFiles(ROUTES_ROOT);
  const discoveredByRoute = new Map();

  for (const filePath of routeFiles) {
    const route = normalizeRoute(filePath);
    const content = fs.readFileSync(filePath, "utf8");
    discoveredByRoute.set(route, {
      filePath,
      content,
      methods: extractMethods(content),
      authSignals: analyzeAuthSignals(content),
    });
  }

  let inventoryRoutes = [];
  try {
    inventoryRoutes = readInventory();
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }

  const inventoryByRoute = new Map();
  const duplicateInventoryEntries = [];

  for (const entry of inventoryRoutes) {
    const route = entry?.route;
    if (typeof route !== "string" || route.length === 0) {
      duplicateInventoryEntries.push(`Invalid route entry: ${JSON.stringify(entry)}`);
      continue;
    }

    if (inventoryByRoute.has(route)) {
      duplicateInventoryEntries.push(`Duplicate inventory route entry: ${route}`);
      continue;
    }

    inventoryByRoute.set(route, entry);
  }

  const missingInInventory = [];
  const staleInventoryEntries = [];
  const methodMismatches = [];
  const findings = [];

  for (const discoveredRoute of discoveredByRoute.keys()) {
    if (!inventoryByRoute.has(discoveredRoute)) {
      missingInInventory.push(discoveredRoute);
    }
  }

  for (const [inventoryRoute, entry] of inventoryByRoute.entries()) {
    const discovered = discoveredByRoute.get(inventoryRoute);
    if (!discovered) {
      staleInventoryEntries.push(inventoryRoute);
      continue;
    }

    const inventoryMethods = Array.isArray(entry.methods)
      ? entry.methods.filter((method) => typeof method === "string").map((method) => method.toUpperCase())
      : [];

    if (!sameMethods(inventoryMethods, discovered.methods)) {
      methodMismatches.push(
        `${inventoryRoute}: inventory=[${inventoryMethods.join(", ")}], file=[${discovered.methods.join(", ")}]`
      );
    }

    checkAuthPolicy(inventoryRoute, entry.policy, discovered.authSignals, findings);
    checkControlPolicy(inventoryRoute, entry.policy, discovered.content, findings);
  }

  console.log("API Guard Audit Summary");
  console.log(`- discovered routes: ${discoveredByRoute.size}`);
  console.log(`- inventory routes: ${inventoryByRoute.size}`);
  console.log(`- missing inventory entries: ${missingInInventory.length}`);
  console.log(`- stale inventory entries: ${staleInventoryEntries.length}`);
  console.log(`- method mismatches: ${methodMismatches.length}`);
  console.log(`- policy findings: ${findings.length + duplicateInventoryEntries.length}`);

  if (duplicateInventoryEntries.length > 0) {
    console.error("\nInventory definition issues:");
    for (const issue of duplicateInventoryEntries) {
      console.error(`- ${issue}`);
    }
  }

  if (missingInInventory.length > 0) {
    console.error("\nRoutes missing from inventory:");
    for (const route of missingInInventory) {
      console.error(`- ${route}`);
    }
  }

  if (staleInventoryEntries.length > 0) {
    console.error("\nStale inventory entries (route file not found):");
    for (const route of staleInventoryEntries) {
      console.error(`- ${route}`);
    }
  }

  if (methodMismatches.length > 0) {
    console.error("\nRoute method mismatches:");
    for (const mismatch of methodMismatches) {
      console.error(`- ${mismatch}`);
    }
  }

  if (findings.length > 0) {
    console.error("\nPolicy enforcement findings:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
  }

  if (
    duplicateInventoryEntries.length > 0 ||
    missingInInventory.length > 0 ||
    staleInventoryEntries.length > 0 ||
    methodMismatches.length > 0 ||
    findings.length > 0
  ) {
    process.exit(1);
  }

  console.log("\nAPI auth guard audit passed.");
}

main();
