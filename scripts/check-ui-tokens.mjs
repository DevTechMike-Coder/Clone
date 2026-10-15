#!/usr/bin/env node

/**
 * Token Lint Script: check-ui-tokens.mjs
 *
 * Scans `app/` and `components/` for raw Tailwind slate/gray/zinc/neutral color classes
 * and un-tokenized hex literals.
 *
 * Usage:
 *   node scripts/check-ui-tokens.mjs            # Report-only mode (prints baseline)
 *   node scripts/check-ui-tokens.mjs --enforce  # CI enforcement mode (fails if violations > 0)
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const TARGET_DIRS = ["app", "components"];
const ALLOWED_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);

// Whitelisted files that are legitimately allowed to declare raw tokens
const WHITELIST = new Set([
  path.normalize("constants/theme.ts"),
  path.normalize("global.css"),
  path.normalize("app/(pages)/uiGallery.tsx"),
]);

const RAW_CLASS_REGEX = /\b(?:bg|text|border|placeholder|fill|stroke)-(?:slate|gray|zinc|neutral)-(?:50|100|200|300|400|500|600|700|800|900|950)\b/g;
const HEX_LITERAL_REGEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;

function collectFiles(dirPath) {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== ".git" && entry.name !== ".expo") {
        results.push(...collectFiles(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if (ALLOWED_EXTENSIONS.has(ext)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

function checkFile(filePath) {
  const relPath = path.normalize(path.relative(rootDir, filePath));
  if (WHITELIST.has(relPath)) {
    return { relPath, rawClasses: [], hexLiterals: [] };
  }

  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");

  const rawClasses = [];
  const hexLiterals = [];

  lines.forEach((line, index) => {
    // Skip full comment lines
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    // Match raw Tailwind classes
    const classMatches = line.match(RAW_CLASS_REGEX);
    if (classMatches) {
      for (const m of classMatches) {
        rawClasses.push({ line: index + 1, match: m });
      }
    }

    // Match hex literals (ignore URL hashes or import paths)
    const hexMatches = line.match(HEX_LITERAL_REGEX);
    if (hexMatches) {
      for (const m of hexMatches) {
        hexLiterals.push({ line: index + 1, match: m });
      }
    }
  });

  return { relPath, rawClasses, hexLiterals };
}

function run() {
  const enforce = process.argv.includes("--enforce");
  const verbose = process.argv.includes("--verbose");

  console.log("\n=======================================================");
  console.log("       Clone UI Design Token Audit & Lint Script       ");
  console.log("=======================================================\n");

  const allFiles = [];
  for (const dir of TARGET_DIRS) {
    allFiles.push(...collectFiles(path.join(rootDir, dir)));
  }

  let totalRawClasses = 0;
  let totalHexLiterals = 0;
  const fileReports = [];

  for (const file of allFiles) {
    const report = checkFile(file);
    if (report.rawClasses.length > 0 || report.hexLiterals.length > 0) {
      totalRawClasses += report.rawClasses.length;
      totalHexLiterals += report.hexLiterals.length;
      fileReports.push(report);
    }
  }

  // Sort files by number of findings descending
  fileReports.sort(
    (a, b) =>
      b.rawClasses.length + b.hexLiterals.length - (a.rawClasses.length + a.hexLiterals.length)
  );

  console.log(`Audited ${allFiles.length} component & screen files.`);
  console.log(`Files with unmigrated tokens: ${fileReports.length}\n`);

  console.log("-------------------------------------------------------");
  console.log(`Raw Tailwind Palette Classes (slate/gray/*):  ${totalRawClasses}`);
  console.log(`Hardcoded Hex Literals (#RGB/#RRGGBB):        ${totalHexLiterals}`);
  console.log("-------------------------------------------------------\n");

  if (verbose || fileReports.length <= 15) {
    console.log("Top unmigrated files:");
    fileReports.slice(0, 15).forEach((r) => {
      console.log(
        `  • ${r.relPath.padEnd(45)} | ${String(r.rawClasses.length).padStart(3)} classes | ${String(
          r.hexLiterals.length
        ).padStart(2)} hex`
      );
    });
    console.log("");
  }

  if (enforce) {
    if (totalRawClasses > 0 || totalHexLiterals > 0) {
      console.error("❌ Token lint FAILED in enforcement mode: non-tokenized values detected.");
      process.exit(1);
    } else {
      console.log("✅ Token lint PASSED: 100% token adoption across all UI files!");
      process.exit(0);
    }
  } else {
    console.log("ℹ️  Report-only baseline complete. Run with --enforce in CI when migration completes.\n");
  }
}

run();
