import fs from "fs";
import path from "path";
import os from "os";
import { shell, dialog } from "electron";
import { spawn } from "child_process";

const TOKEN_DIR = path.join(os.homedir(), ".conf-saver");
const TOKEN_PATH = path.join(TOKEN_DIR, "gitlab-token.json");

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
    if (!fs.existsSync(TOKEN_DIR)) fs.mkdirSync(TOKEN_DIR, { recursive: true });
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("[GitLab] writeStoredToken error:", err);
  }
}

function clearStoredToken() {
  try {
    if (fs.existsSync(TOKEN_PATH)) fs.unlinkSync(TOKEN_PATH);
  } catch (err) {
    console.error("[GitLab] clearStoredToken error:", err);
  }
}

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
  const stored = readStoredToken();
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
    writeStoredToken({
      host,
      token,
      username: user.username || user.name || null,
      id: user.id,
      avatar_url: user.avatar_url || null,
    });
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
  clearStoredToken();
  return { connected: false, host: null, login: null, avatarUrl: null };
}

/**
 * List projects accessible to the user (membership=true)
 * supports pagination
 */
export async function listUserRepos() {
  const stored = readStoredToken();
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
