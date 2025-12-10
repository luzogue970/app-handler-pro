import fs from "fs";
import path from "path";
import os from "os";
import { shell, dialog } from "electron";
import { spawn } from "child_process";
import { openInVSCode } from "./commands.js";

const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID || "Ov23liZUPGu4OWZ9PPQN";

const TOKEN_DIR = path.join(os.homedir(), ".conf-saver");
const TOKEN_PATH = path.join(TOKEN_DIR, "github-token.json");

function readStoredToken() {
  try {
    if (!fs.existsSync(TOKEN_PATH)) return null;
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  } catch {
    return null;
  }
}

function writeStoredToken(data) {
  try {
    if (!fs.existsSync(TOKEN_DIR)) {
      fs.mkdirSync(TOKEN_DIR, { recursive: true });
    }
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[GitHub] writeStoredToken error:", err);
  }
}

function clearStoredToken() {
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  } catch (err) {
    console.error("[GitHub] clearStoredToken error:", err);
  }
}

function wait(ms) {
  return new Promise((res) => setTimeout(res, ms));
}

async function fetchGitHubUser(accessToken) {
  const res = await fetch("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "conf-saver-app",
    },
  });

  if (!res.ok) throw new Error(`GitHub /user error: ${res.status}`);
  return res.json();
}

export async function getAuthStatus() {
  const stored = readStoredToken();
  if (!stored || !stored.access_token) {
    return {
      connected: false,
      login: null,
      avatarUrl: null,
    };
  }

  return {
    connected: true,
    login: stored.login || null,
    avatarUrl: stored.avatar_url || null,
  };
}

async function startDeviceFlow(scope = "public_repo") {
  const res = await fetch("https://github.com/login/device/code", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      client_id: GITHUB_CLIENT_ID,
      scope,
    }),
  });

  if (!res.ok) throw new Error(`device/code error: ${res.status}`);
  return res.json();
}

async function pollForAccessToken(deviceCode, intervalSec, expiresInSec) {
  const start = Date.now();
  let delay = intervalSec * 1000;

  while (true) {
    if (Date.now() - start > expiresInSec * 1000) {
      throw new Error("Device code expiré");
    }

    const res = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: GITHUB_CLIENT_ID,
        device_code: deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }),
    });

    if (!res.ok) throw new Error(`access_token error: ${res.status}`);
    const data = await res.json();

    if (data.error) {
      if (data.error === "authorization_pending") {
        await wait(delay);
        continue;
      }
      if (data.error === "slow_down") {
        delay += 5000;
        await wait(delay);
        continue;
      }
      throw new Error(`OAuth error: ${data.error}`);
    }

    return data;
  }
}

export async function login() {
  if (!GITHUB_CLIENT_ID || GITHUB_CLIENT_ID === "TON_CLIENT_ID_GITHUB") {
    throw new Error("GITHUB_CLIENT_ID non configuré");
  }

  const deviceInfo = await startDeviceFlow();

  const urlToOpen =
    deviceInfo.verification_uri_complete || deviceInfo.verification_uri;
  shell.openExternal(urlToOpen);

  console.log("[GitHub] Tape ce code sur GitHub :", deviceInfo.user_code);

  const tokenData = await pollForAccessToken(
    deviceInfo.device_code,
    deviceInfo.interval,
    deviceInfo.expires_in
  );

  const user = await fetchGitHubUser(tokenData.access_token);

  writeStoredToken({
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    scope: tokenData.scope,
    login: user.login,
    avatar_url: user.avatar_url,
    id: user.id,
  });

  return {
    connected: true,
    login: user.login,
    avatarUrl: user.avatar_url,
  };
}

export async function logout() {
  clearStoredToken();
  return {
    connected: false,
    login: null,
    avatarUrl: null,
  };
}

export async function listUserRepos() {
  const stored = readStoredToken();
  if (!stored || !stored.access_token) {
    throw new Error("Utilisateur non connecté à GitHub");
  }

  const all = [];
  let page = 1;

  while (true) {
    const res = await fetch(
      `https://api.github.com/user/repos?per_page=100&page=${page}`,
      {
        headers: {
          Accept: "application/vnd.github+json",
          Authorization: `Bearer ${stored.access_token}`,
          "User-Agent": "conf-saver-app",
        },
      }
    );

    if (!res.ok) throw new Error(`GitHub /user/repos error: ${res.status}`);

    const batch = await res.json();
    all.push(...batch);
    if (batch.length < 100) break;
    page++;
  }

  return all.map((r) => ({
    id: r.id,
    name: r.name,
    fullName: r.full_name,
    private: r.private,
    description: r.description,
    htmlUrl: r.html_url,
    sshUrl: r.ssh_url,
    cloneUrl: r.clone_url,
    defaultBranch: r.default_branch,
    updatedAt: r.updated_at,
  }));
}

async function startDeviceFlowPublic(scope) {
  return startDeviceFlow(scope);
}

export async function completeDeviceLogin(
  deviceCode,
  intervalSec,
  expiresInSec
) {
  const tokenData = await pollForAccessToken(
    deviceCode,
    intervalSec,
    expiresInSec
  );
  const user = await fetchGitHubUser(tokenData.access_token);

  writeStoredToken({
    access_token: tokenData.access_token,
    token_type: tokenData.token_type,
    scope: tokenData.scope,
    login: user.login,
    avatar_url: user.avatar_url,
    id: user.id,
  });

  return {
    connected: true,
    login: user.login,
    avatarUrl: user.avatar_url,
  };
}

async function runGit(args, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn("git", args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...opts,
    });
    let stdout = "";
    let stderr = "";

    p.stdout.on("data", (d) => (stdout += d.toString()));
    p.stderr.on("data", (d) => (stderr += d.toString()));

    p.on("error", (err) => reject(err));
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else
        reject(new Error(`git exited with code ${code}\n${stderr || stdout}`));
    });
  });
}

export async function pullRepo(remote) {
  if (!remote) throw new Error("pullRepo: remote argument required");

  const isUrl = /^(https?:\/\/|git@|ssh:\/\/)/i.test(remote);

  try {
    if (!isUrl) {
      const repoPath = path.resolve(remote);
      if (!fs.existsSync(repoPath))
        throw new Error("Path does not exist: " + repoPath);
      if (!fs.existsSync(path.join(repoPath, ".git"))) {
        throw new Error("Not a git repository: " + repoPath);
      }
      const result = await runGit(["pull"], { cwd: repoPath });
      return { success: true, action: "pull", path: repoPath, ...result };
    }

    const res = await dialog.showOpenDialog({
      title: "Choisir le dossier parent pour cloner le repo",
      properties: ["openDirectory", "createDirectory"],
      buttonLabel: "Sélectionner",
    });

    if (res.canceled) return { success: false, canceled: true };

    const parent = res.filePaths[0];
    const repoName = path.basename(remote).replace(/\.git$/, "");
    const target = path.join(parent, repoName);

    try {
      const opened = await openInVSCode(target);
      console.log("[GitHub] openInVSCode:", opened);
    } catch (err) {
      console.warn("[GitHub] openInVSCode failed:", err);
    }

    if (fs.existsSync(target)) {
      if (fs.existsSync(path.join(target, ".git"))) {
        const result = await runGit(["pull"], { cwd: target });
        return { success: true, action: "pull", path: target, ...result };
      } else {
        throw new Error(
          "Target path already exists and is not a git repository: " + target
        );
      }
    }

    const result = await runGit(["clone", remote, target], {});
    return { success: true, action: "clone", path: target, ...result };
  } catch (err) {
    throw new Error(`[GitHub.pullRepo] ${err?.message ?? String(err)}`);
  }
}

export async function createRemoteRepo(opts = {}) {
  let name;
  let description = "";
  let isPrivate = false;
  let org;

  if (typeof opts === "string") {
    name = opts;
    description = arguments[1] ?? "";
    isPrivate = arguments[2] ?? false;
    org = arguments[3];
  } else {
    ({ name, description = "", private: isPrivate = false, org } = opts || {});
  }

  console.log("[GitHub] createRemoteRepo args:", {
    name,
    description,
    isPrivate,
    org,
  });

  const tokenData = readStoredToken();
  const token = tokenData?.access_token;
  if (!token) throw new Error("No GitHub token stored");

  if (!name) throw new Error("Repository name required");

  const url = org
    ? `https://api.github.com/orgs/${encodeURIComponent(org)}/repos`
    : "https://api.github.com/user/repos";

  const body = {
    name,
    description,
    private: !!isPrivate,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `token ${token}`,
      Accept: "application/vnd.github+json",
      "User-Agent": "app-handler-pro",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await res.json();

  if (!res.ok) {
    const apiMsg = data?.message || JSON.stringify(data);
    const advise =
      res.status === 404
        ? "Not Found — vérifie l'URL/organisation et que le token est valide."
        : res.status === 401
        ? "Unauthorized — token invalide."
        : res.status === 403
        ? "Forbidden — token sans scope. Reconnecte-toi en demandant le scope 'public_repo' ou 'repo'."
        : null;
    throw new Error(
      `GitHub API error: ${apiMsg}${advise ? " — " + advise : ""}`
    );
  }

  return data;
}

export async function pushLocalToRemote(opts = {}) {
  let localPath = "";
  let remoteUrl = "";
  let branch = "";

  if (typeof opts === "string") {
    localPath = opts;
    remoteUrl = arguments[1] ?? "";
    branch = arguments[2] ?? "main";
  } else {
    ({ localPath, remoteUrl = "", branch } = opts || {});
  }

  console.log(
    "ici info pushLocaltoRemote github.js: " + localPath + " " + remoteUrl
  );

  if (!localPath || !remoteUrl)
    throw new Error("localPath and remoteUrl required");

  const repoPath = path.resolve(localPath);
  if (!fs.existsSync(repoPath))
    throw new Error("Local path does not exist: " + repoPath);

  try {
    if (!fs.existsSync(path.join(repoPath, ".git"))) {
      await runGit(["init"], { cwd: repoPath });
    }

    await runGit(["add", "-A"], { cwd: repoPath });

    let status;
    try {
      status = await runGit(["status", "--porcelain"], { cwd: repoPath });
    } catch (e) {
      status = { stdout: "" };
    }
    if ((status.stdout || "").trim()) {
      await runGit(["commit", "-m", "Initial commit from app-handler-pro"], {
        cwd: repoPath,
        env: { ...process.env },
      }).catch((e) => {
        console.warn("[Git] commit failed:", e.message || e);
      });
    }

    try {
      await runGit(["remote", "add", "origin", remoteUrl], { cwd: repoPath });
    } catch (e) {
      await runGit(["remote", "set-url", "origin", remoteUrl], {
        cwd: repoPath,
      });
    }

    await runGit(["branch", "-M", branch], { cwd: repoPath });

    const pushResult = await runGit(["push", "-u", "origin", branch], {
      cwd: repoPath,
    });

    return { success: true, action: "push", path: repoPath, ...pushResult };
  } catch (err) {
    return { success: false, error: err?.message ?? String(err) };
  }
}

export { startDeviceFlowPublic as startDeviceFlow };
