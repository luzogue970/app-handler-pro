import fs from "fs";
import path from "path";
import os from "os";
import { shell, dialog } from "electron";
import { spawn } from "child_process";
import {
  readStoredToken,
  writeStoredToken,
  clearStoredToken,
} from "./gitProviderHelper.js";

const providerName = "gitlab";
const token_dir = path.join(os.homedir(), ".conf-saver");
const tokenPath = path.join(token_dir, providerName + "-token.json");

async function fetchGitLabUser(host, token) {
  const base = host.replace(/\/+$/, "");

  let res = await fetch(`${base}/api/v4/user`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      "User-Agent": "conf-saver-app",
    },
  });
  if (res.status === 401 || res.status === 403) {
    res = await fetch(`${base}/api/v4/user`, {
      headers: {
        Accept: "application/json",
        "PRIVATE-TOKEN": token,
        "User-Agent": "conf-saver-app",
      },
    });
  }
  if (!res.ok) throw new Error(`GitLab /user error: ${res.status}`);
  return res.json();
}

export async function getAuthStatus() {
  const stored = readStoredToken(tokenPath);
  if (!stored || !stored.token || !stored.host) {
    return { connected: false, host: null, login: null, avatarUrl: null };
  }
  return {
    connected: true,
    host: stored.host,
    login: stored.username || null,
    avatarUrl: stored.avatar_url || null,
  };
}

/**
 * Login by Personal Access Token (works with gitlab.com and self-hosted GitLab)
 * host: e.g. "https://gitlab.com" or "https://gitlab.mycompany.com"
 * token: PAT or OAuth token
 */
export async function loginWithToken(host = "https://gitlab.com", token) {
  if (!host || !token) throw new Error("host and token required");
  try {
    const user = await fetchGitLabUser(host, token);
    writeStoredToken(
      {
        host,
        token,
        username: user.username || user.name || null,
        id: user.id,
        avatar_url: user.avatar_url || null,
      },
      tokenPath
    );
    return {
      connected: true,
      host,
      login: user.username || user.name,
      avatarUrl: user.avatar_url || null,
    };
  } catch (err) {
    throw new Error(`[GitLab.loginWithToken] ${err?.message ?? String(err)}`);
  }
}

export function logout() {
  clearStoredToken(tokenPath);
  return { connected: false, host: null, login: null, avatarUrl: null };
}

/**
 * List projects accessible to the user (membership=true)
 * supports pagination
 */
export async function listUserRepos() {
  const stored = readStoredToken(tokenPath);
  if (!stored || !stored.token || !stored.host)
    throw new Error("Utilisateur non connecté à GitLab");

  const base = stored.host.replace(/\/+$/, "");
  const all = [];
  let page = 1;
  const perPage = 100;

  while (true) {
    const res = await fetch(
      `${base}/api/v4/projects?membership=true&per_page=${perPage}&page=${page}`,
      {
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${stored.token}`,
          "User-Agent": "conf-saver-app",
        },
      }
    );

    if (res.status === 401 || res.status === 403) {
      const res2 = await fetch(
        `${base}/api/v4/projects?membership=true&per_page=${perPage}&page=${page}`,
        {
          headers: {
            Accept: "application/json",
            "PRIVATE-TOKEN": stored.token,
            "User-Agent": "conf-saver-app",
          },
        }
      );
      if (!res2.ok) throw new Error(`GitLab /projects error: ${res2.status}`);
      const batch2 = await res2.json();
      all.push(...batch2);
      if (batch2.length < perPage) break;
      page++;
      continue;
    }

    if (!res.ok) throw new Error(`GitLab /projects error: ${res.status}`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < perPage) break;
    page++;
  }

  return all.map((p) => ({
    id: p.id,
    name: p.name,
    path: p.path_with_namespace || p.path,
    description: p.description,
    webUrl: p.web_url,
    sshUrl: p.ssh_url_to_repo,
    httpUrl: p.http_url_to_repo,
    visibility: p.visibility,
    defaultBranch: p.default_branch,
    lastActivityAt: p.last_activity_at,
  }));
}

export async function pullProject(remote) {
  const stored = readStoredToken(tokenPath);

  if (!remote) throw new Error("remote required");

  // build a clone URL if user provided "owner/repo" or web url without .git
  let cloneUrl = String(remote).trim();

  // if remote is a short path like "owner/repo", build from stored host if available
  if (
    !/^((git|ssh|http(s)?)|[^/:]+@)/i.test(cloneUrl) &&
    stored &&
    stored.host
  ) {
    const base = stored.host.replace(/\/+$/, "");
    let candidate = cloneUrl;
    if (!candidate.endsWith(".git")) candidate = candidate + ".git";
    cloneUrl = `${base}/${candidate}`;
  } else {
    // ensure http web urls end with .git to clone
    if (/^https?:\/\//i.test(cloneUrl) && !/\.git$/.test(cloneUrl)) {
      cloneUrl = cloneUrl.replace(/\/+$/, "") + ".git";
    }
  }

  // inject token for http(s) clones to private GitLab if host matches and token is present
  try {
    if (
      /^https?:\/\//i.test(cloneUrl) &&
      stored &&
      stored.token &&
      stored.host
    ) {
      const storedHost = stored.host.replace(/\/+$/, "").toLowerCase();
      const urlObj = new URL(cloneUrl);
      if (urlObj.host.toLowerCase().includes(new URL(storedHost).host)) {
        // use oauth2 as username to avoid revealing a real username; encode token
        urlObj.username = "oauth2";
        urlObj.password = encodeURIComponent(stored.token);
        cloneUrl = urlObj.toString();
      }
    }
  } catch (e) {
    // ignore URL parsing errors — fallback to provided cloneUrl
    console.warn("[GitLab] pullProject: URL parse/inject failed", e);
  }

  // ask destination directory
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: "Choisir un dossier de destination pour cloner le dépôt",
    properties: ["openDirectory", "createDirectory"],
    message: "Choisir dossier parent pour le clone",
  });

  if (canceled || !filePaths || filePaths.length === 0) {
    return { success: false, cancelled: true };
  }

  const parentDir = filePaths[0];

  // compute target folder name from cloneUrl
  const repoNameMatch = cloneUrl.split("/").pop() || "repo";
  const repoFolder = repoNameMatch.replace(/\.git$/, "");
  const targetPath = path.join(parentDir, repoFolder);

  // ensure target does not already exist or is empty
  if (fs.existsSync(targetPath)) {
    return {
      success: false,
      error: "Target path already exists",
      path: targetPath,
    };
  }

  // spawn git clone
  return await new Promise((resolve) => {
    const args = ["clone", cloneUrl];
    const child = spawn("git", args, {
      cwd: parentDir,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });

    child.on("error", (err) => {
      console.error("[GitLab] git clone error:", err);
      resolve({ success: false, error: String(err), stdout, stderr });
    });

    child.on("close", (code) => {
      if (code === 0) {
        // open folder in file manager as suggestion
        try {
          shell.showItemInFolder(targetPath);
        } catch (e) {
          // ignore
        }
        resolve({ success: true, path: targetPath, stdout, stderr });
      } else {
        resolve({
          success: false,
          error: `git exited ${code}`,
          code,
          stdout,
          stderr,
        });
      }
    });
  });
}

const execGit = (cwd, args) =>
  new Promise((resolve) => {
    const child = spawn("git", args, {
      cwd,
      env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
    });
    let stdout = "",
      stderr = "";
    child.stdout.on("data", (d) => (stdout += d.toString()));
    child.stderr.on("data", (d) => (stderr += d.toString()));
    child.on("close", (code) => resolve({ code, stdout, stderr }));
    child.on("error", (err) =>
      resolve({ code: -1, stdout, stderr: String(err) })
    );
  });

async function ensureInitialized(localPath) {
  const check = await execGit(localPath, [
    "rev-parse",
    "--is-inside-work-tree",
  ]);
  if (check.code === 0 && /true/i.test(check.stdout || "")) return;
  await execGit(localPath, ["init"]);
  await execGit(localPath, ["add", "-A"]);
  await execGit(localPath, [
    "-c",
    "user.name=conf-saver",
    "-c",
    "user.email=conf-saver@local",
    "commit",
    "--allow-empty",
    "-m",
    "Initial commit",
  ]);
}

export async function pushLocalToRemote(
  localPath,
  remoteUrl,
  branch = "main",
  opts = { createIfMissing: true }
) {
  if (!fs.existsSync(localPath)) throw new Error("local path does not exist");
  if (opts.createIfMissing) await ensureInitialized(localPath);
  const tmpRemote = `tmp-${Date.now()}`;
  await execGit(localPath, ["remote", "add", tmpRemote, remoteUrl]);
  const push = await execGit(localPath, [
    "push",
    tmpRemote,
    branch,
    "--set-upstream",
  ]);
  await execGit(localPath, ["remote", "remove", tmpRemote]);
  if (push.code !== 0)
    return { success: false, error: push.stderr || push.stdout };
  return { success: true, stdout: push.stdout };
}

// utils/gitlab.js
export async function createRemoteRepo(repo) {
  const {
    name,
    description = "",
    private: isPrivate = false,
    namespaceId = null,
  } = repo;

  const stored = readStoredToken(tokenPath);
  if (!stored || !stored.token || !stored.host) {
    throw new Error("Not authenticated");
  }

  const toto = "toto2";
  const body = {
    toto,
    description,
    visibility: isPrivate ? "private" : "public",
  };

  if (namespaceId) body.namespace_id = namespaceId;

  const url = `${stored.host.replace(/\/*$/, "")}/api/v4/projects`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${stored.token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
