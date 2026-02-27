const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const TARGETS = [
  "app/globals.css",
  "app/(protected)/wallet/[id]/PolicyDetailsClient.tsx",
  "app/(protected)/wallet/[id]/AddToWallet.tsx",
  "app/(protected)/home/page.tsx",
  "app/(protected)/agent/AgentClient.tsx",
  "components/account/AccountOverview.tsx",
  "components/account/Billing.tsx",
  "components/account/Referrals.tsx",
  "components/account/Settings.tsx",
  "components/wallet/PolicyTable.tsx",
  "components/wallet/PolicyWallet.tsx",
  "components/coverage/CoverageInsightsClient.tsx",
  "components/coverage/InsightCard.tsx",
  "components/notifications/NotificationsClient.tsx",
];

const SUSPICIOUS = /Ã|Â|â€|�|\?{3,}/;

function scanFile(filePath) {
  const abs = path.join(ROOT, filePath);
  if (!fs.existsSync(abs)) return [];

  const content = fs.readFileSync(abs, "utf8");
  const lines = content.split(/\r?\n/);
  const hits = [];

  for (let i = 0; i < lines.length; i += 1) {
    if (SUSPICIOUS.test(lines[i])) {
      hits.push({ line: i + 1, text: lines[i].trim() });
    }
  }

  return hits;
}

let hasError = false;

for (const filePath of TARGETS) {
  const hits = scanFile(filePath);
  if (hits.length === 0) continue;

  hasError = true;
  console.error(`Mojibake candidates found in ${filePath}:`);
  for (const hit of hits) {
    console.error(`  ${hit.line}: ${hit.text}`);
  }
}

if (hasError) {
  console.error("\nEncoding check failed.");
  process.exit(1);
}

console.log("Encoding check passed.");
