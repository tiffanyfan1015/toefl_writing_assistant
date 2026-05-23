import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(backendRoot, "..");

const key = randomBytes(24).toString("base64url");
const write = process.argv.includes("--write");

function upsertEnvVar(content, name, value) {
  const line = `${name}="${value}"`;
  const pattern = new RegExp(`^${name}=.*$`, "m");
  if (pattern.test(content)) {
    return content.replace(pattern, line);
  }
  const trimmed = content.replace(/\n?$/, "");
  return `${trimmed}\n${line}\n`;
}

function writeEnvFile(path, updates) {
  const base = existsSync(path) ? readFileSync(path, "utf8") : "";
  let content = base;
  for (const [name, value] of Object.entries(updates)) {
    content = upsertEnvVar(content, name, value);
  }
  writeFileSync(path, content.endsWith("\n") ? content : `${content}\n`);
}

console.log("Generated local API key:\n");
console.log(key);
console.log("\nUse in requests:");
console.log(`  Authorization: Bearer ${key}`);
console.log("\nEnv files:");
console.log(`  backend/.env   → API_KEY="${key}"`);
console.log(`  frontend/.env  → VITE_API_KEY="${key}"`);

if (write) {
  const backendEnv = join(backendRoot, ".env");
  const frontendEnv = join(repoRoot, "frontend", ".env");
  writeEnvFile(backendEnv, { API_KEY: key });
  writeEnvFile(frontendEnv, { VITE_API_KEY: key });
  console.log("\nWrote API_KEY and VITE_API_KEY to:");
  console.log(`  ${backendEnv}`);
  console.log(`  ${frontendEnv}`);
} else {
  console.log("\nTo write both .env files automatically, run:");
  console.log("  npm run generate-api-key -- --write");
}
