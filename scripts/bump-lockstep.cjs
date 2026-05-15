#!/usr/bin/env node
/**
 * Lockstep semver for @threevl/* packages.
 * Canonical version: root package.json "version".
 * Usage: node scripts/bump-lockstep.cjs <patch|minor|major|sync>
 */
const fs = require("node:fs");
const path = require("node:path");
const { execSync } = require("node:child_process");

const rootDir = path.resolve(__dirname, "..");
const rootPkgPath = path.join(rootDir, "package.json");

const workspacePackages = [
  path.join(rootDir, "packages", "hpo-lib", "package.json"),
  path.join(rootDir, "packages", "hpo-middleware", "package.json"),
  path.join(rootDir, "packages", "hpo-express", "package.json"),
  path.join(rootDir, "packages", "hpo-api", "package.json"),
];

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJson(p, obj) {
  fs.writeFileSync(p, `${JSON.stringify(obj, null, 2)}\n`, "utf8");
}

function parseSemver(v) {
  const m = String(v).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!m) {
    throw new Error(
      `Invalid or unsupported version "${v}" (use X.Y.Z with no prerelease for lockstep).`,
    );
  }
  return { major: +m[1], minor: +m[2], patch: +m[3] };
}

function formatSemver({ major, minor, patch }) {
  return `${major}.${minor}.${patch}`;
}

function bump(current, release) {
  const v = parseSemver(current);
  if (release === "major") {
    v.major += 1;
    v.minor = 0;
    v.patch = 0;
  } else if (release === "minor") {
    v.minor += 1;
    v.patch = 0;
  } else if (release === "patch") {
    v.patch += 1;
  } else {
    throw new Error(`Unknown release "${release}"`);
  }
  return formatSemver(v);
}

function applyVersion(version) {
  const range = `^${version}`;

  const rootPkg = readJson(rootPkgPath);
  rootPkg.version = version;
  writeJson(rootPkgPath, rootPkg);

  const lib = readJson(workspacePackages[0]);
  lib.version = version;
  writeJson(workspacePackages[0], lib);

  const middleware = readJson(workspacePackages[1]);
  middleware.version = version;
  middleware.dependencies = middleware.dependencies || {};
  middleware.dependencies["@threevl/hpo-lib"] = range;
  writeJson(workspacePackages[1], middleware);

  const express = readJson(workspacePackages[2]);
  express.version = version;
  express.dependencies = express.dependencies || {};
  express.dependencies["@threevl/hpo-middleware"] = range;
  writeJson(workspacePackages[2], express);

  const api = readJson(workspacePackages[3]);
  api.version = version;
  api.dependencies = api.dependencies || {};
  api.dependencies["@threevl/hpo-express"] = range;
  api.dependencies["@threevl/hpo-lib"] = range;
  writeJson(workspacePackages[3], api);
}

const cmd = process.argv[2];
if (!cmd || ["-h", "--help"].includes(cmd)) {
  console.error(
    "Usage: node scripts/bump-lockstep.cjs <patch|minor|major|sync>",
  );
  process.exit(cmd ? 0 : 1);
}

const rootPkg = readJson(rootPkgPath);
if (!rootPkg.version && cmd !== "sync") {
  console.error('Root package.json must have a "version" field.');
  process.exit(1);
}

let nextVersion;
if (cmd === "sync") {
  if (!rootPkg.version) {
    console.error('Root package.json must have a "version" field for sync.');
    process.exit(1);
  }
  nextVersion = rootPkg.version;
  parseSemver(nextVersion);
  console.log(`Syncing workspace packages to ${nextVersion}...`);
} else if (["patch", "minor", "major"].includes(cmd)) {
  const current = rootPkg.version || readJson(workspacePackages[0]).version;
  parseSemver(current);
  nextVersion = bump(current, cmd);
  console.log(`Bumping ${current} → ${nextVersion} (${cmd})...`);
} else {
  console.error("Unknown command:", cmd);
  process.exit(1);
}

applyVersion(nextVersion);
console.log(
  "Updated root + packages/hpo-{lib,middleware,express,api}/package.json",
);

try {
  execSync("npm install", { cwd: rootDir, stdio: "inherit" });
} catch {
  console.warn("npm install failed; run it manually to refresh package-lock.json.");
  process.exit(1);
}
