import fs from "fs";
import path from "path";
import { detectProjectType } from "./projectTypeDetector.js";

function normalizeRemoteToHttps(remote) {
  if (!remote) return null;

  if (remote.startsWith("http://") || remote.startsWith("https://")) {
    return remote.replace(/\.git$/, "");
  }

  const sshRegex = /^git@([^:]+):(.+)\.git$/;
  const match = remote.match(sshRegex);
  if (match) {
    const host = match[1];
    const repo = match[2];
    return `https://${host}/${repo}`;
  }

  const ssh2Regex = /^ssh:\/\/git@([^/]+)\/(.+)\.git$/;
  const match2 = remote.match(ssh2Regex);
  if (match2) {
    const host = match2[1];
    const repo = match2[2];
    return `https://${host}/${repo}`;
  }

  return remote;
}

function getGitRemote(repoPath) {
  const configPath = path.join(repoPath, ".git", "config");
  if (!fs.existsSync(configPath)) return null;

  const content = fs.readFileSync(configPath, "utf8");
  const lines = content.split(/\r?\n/);

  let inOriginSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^\[remote\s+"(.+)"\]/);
    if (match) {
      inOriginSection = match[1] === "origin";
      continue;
    }

    if (inOriginSection && trimmed.startsWith("url")) {
      const parts = trimmed.split("=");
      if (parts.length >= 2) {
        return normalizeRemoteToHttps(parts[1].trim());
      }
    }
  }
  return null;
}

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "venv",
  "dist",
  "build",
  ".next",
  ".turbo",
  ".cache",
  "lib",
]);

export function pathReader(startPath, result = []) {
  let entries;
  try {
    entries = fs.readdirSync(startPath, { withFileTypes: true });
  } catch {
    return result;
  }

  const { type, launchCommands } = detectProjectType(startPath);
  const launchCommand =
    Array.isArray(launchCommands) && launchCommands.length
      ? launchCommands[0]
      : null;
  const remote = getGitRemote(startPath);

  const isDevProject =
    (type && type !== "unknown") || !!launchCommand || !!remote;

  if (isDevProject) {
    result.push({
      name: path.basename(startPath),
      path: startPath,
      remote,
      type,
      launchCommand,
      launchCommands: Array.isArray(launchCommands) ? launchCommands : [],
    });
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) {
      if (entry.name !== ".") continue;
    }
    if (IGNORED_DIRS.has(entry.name)) continue;

    const subPath = path.join(startPath, entry.name);
    pathReader(subPath, result);
  }

  return result;
}
