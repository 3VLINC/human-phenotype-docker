#!/usr/bin/env node
// #region agent log
/* Debug workspace + dist layout before hpo-api tsc (session d999be). */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const logPath = path.join(root, ".cursor", "debug-d999be.log");
const endpoint =
  "http://127.0.0.1:7933/ingest/3709fdcc-9c2f-423d-b25d-1d9d07f4d43c";
const sessionId = "d999be";

function emit(payload) {
  const line = JSON.stringify({
    sessionId,
    timestamp: Date.now(),
    ...payload,
  });
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true });
    fs.appendFileSync(logPath, line + "\n");
  } catch {
    /* ignore */
  }
  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": sessionId,
    },
    body: line,
  }).catch(() => {});
}

const phase = process.argv[2] || "unknown";
const nmExpress = path.join(root, "node_modules", "@threevl", "hpo-express");
const nmLib = path.join(root, "node_modules", "@threevl", "hpo-lib");
const distExpress = path.join(
  root,
  "packages",
  "hpo-express",
  "dist",
  "index.d.ts"
);
const distLib = path.join(root, "packages", "hpo-lib", "dist", "index.d.ts");
const pkgExpress = path.join(nmExpress, "package.json");

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

let pkgExpressTypes = null;
try {
  if (exists(pkgExpress)) {
    const j = JSON.parse(fs.readFileSync(pkgExpress, "utf8"));
    pkgExpressTypes = j.types ?? null;
  }
} catch {
  pkgExpressTypes = "read_error";
}

const data = {
  phase,
  cwd: process.cwd(),
  npmVersion: process.env.npm_config_user_agent || "unknown",
  node: process.version,
  root,
  symlinkExpress: exists(nmExpress),
  symlinkLib: exists(nmLib),
  distExpressDts: exists(distExpress),
  distLibDts: exists(distLib),
  pkgExpressTypes,
};

emit({
  hypothesisId: "H1-H5",
  location: "scripts/npm-workspace-debug.cjs",
  message: "pre-api workspace snapshot",
  data,
});

console.log("[npm-workspace-debug]", JSON.stringify(data));
// #endregion agent log
