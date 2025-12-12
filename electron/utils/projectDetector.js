
import fsSync from "fs";
import path from "path";
import { scanForProjects } from "./ProjectScanner.js";
import { detectProjectType } from "./projectTypeDetector.js";

/**
 * Use scanForProjects(...) then enrich each detected project with detectProjectType(...)
 * Return same shape as before: { path, score, reasons, type, launchCommands }
 */

function isIgnoredName(name, ignoreSet) {
  return ignoreSet.has(name.toLowerCase());
}

function findNearbyProjectDirSync(
  baseDir,
  maxDepth = 2,
  extraIgnore = new Set()
) {
  const q = [{ dir: baseDir, depth: 0 }];
  const seen = new Set();
  const targets = new Set([
    "package.json",
    "go.mod",
    "Cargo.toml",
    "pyproject.toml",
    "pom.xml",
    "composer.json",
  ]);
  while (q.length) {
    const { dir, depth } = q.shift();
    if (seen.has(dir)) continue;
    seen.add(dir);
    try {
      const entries = fsSync.readdirSync(dir, { withFileTypes: true });
      for (const e of entries) {
        if (e.isFile() && targets.has(e.name)) return dir;
      }
      if (depth < maxDepth) {
        for (const e of entries) {
          if (!e.isDirectory()) continue;
          if (e.name.startsWith(".") || isIgnoredName(e.name, extraIgnore))
            continue;
          q.push({ dir: path.join(dir, e.name), depth: depth + 1 });
        }
      }
    } catch {
      continue;
    }
  }
  return null;
}

export async function detectProjectsAndCommands(rootPath, options = {}) {
  const projects = await scanForProjects(rootPath, options);

  const defaultIgnore = new Set([
    "node_modules",
    ".git",
    ".hg",
    ".svn",
    "vendor",
    "dist",
    "build",
    "out",
    ".next",
    ".nuxt",
    ".idea",
    ".vscode",
    ".vs",
    "coverage",
    ".cache",
    "target",
    "bin",
    "obj",
    ".venv",
  ]);
  const out = [];

  for (const p of projects) {
    let det;
    try {
      det = detectProjectType(p.path);
    } catch {
      det = { type: "unknown", launchCommands: [] };
    }

    if (
      (!det.launchCommands || det.launchCommands.length === 0) &&
      det.type === "unknown"
    ) {
      const nearby = findNearbyProjectDirSync(p.path, 2, defaultIgnore);
      if (nearby && nearby !== p.path) {
        try {
          const det2 = detectProjectType(nearby);
          if (det2 && det2.launchCommands && det2.launchCommands.length > 0) {
            out.push({
              path: nearby,
              score: p.score,
              reasons: [...p.reasons, "proxied-from-parent"],
              type: det2.type,
              launchCommands: det2.launchCommands,
            });
            continue;
          }
        } catch { /* empty */ }
      }
    }

    out.push({
      path: p.path,
      score: p.score,
      reasons: p.reasons,
      type: det.type,
      launchCommands: det.launchCommands,
    });
  }

  return out;
}

export function analyzeProjectSync(dir) {
  const det = detectProjectType(dir);
  return {
    path: dir,
    type: det.type,
    launchCommands: det.launchCommands,
  };
}
