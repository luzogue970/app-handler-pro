import { ipcMain } from "electron";
import { getAuthStatus, loginWithToken, listUserRepos, logout } from "../utils/gitlab.js";

export default function GitLabIPCInit() {
  ipcMain.handle("gitlab-get-status", async () => {
    try {
      return await getAuthStatus();
    } catch (err) {
      console.error("[GitLab] getAuthStatus error:", err);
      return { connected: false, error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("gitlab-login-token", async (_event, args) => {
    try {
      const { host, token } = args || {};
      return await loginWithToken(host || "https://gitlab.com", token);
    } catch (err) {
      console.error("[GitLab] loginWithToken error:", err);
      return { connected: false, error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("gitlab-logout", async () => {
    try {
      return logout();
    } catch (err) {
      console.error("[GitLab] logout error:", err);
      return { connected: false, error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("gitlab-list-repos", async () => {
    try {
      return await listUserRepos();
    } catch (err) {
      console.error("[GitLab] listUserRepos error:", err);
      return { error: err.message ?? String(err) };
    }
  });
}