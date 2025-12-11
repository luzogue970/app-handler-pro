import { ipcMain } from "electron";
import {
  getAuthStatus,
  loginWithToken,
  listUserRepos,
  logout,
  pullProject as pullProjectUtil,
  createRemoteRepo as createRemoteRepoUtil,
  pushLocalToRemote as pushLocalToRemoteUtil,
} from "../utils/gitlab.js";

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

  ipcMain.handle("gitlab-pull-repo", async (_event, args) => {
    try {
      const { remote } = args || {};
      if (!remote) throw new Error("remote required");
      const res = await pullProjectUtil(String(remote));
      return res;
    } catch (err) {
      console.error("[GitLab] pullProject error:", err);
      return { success: false, error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("gitlab-create-repo", async (_event, args) => {
    try {
      const { name, description, isPrivate, namespaceId } = args || {};
      if (!name) throw new Error("name required");
      const res = await createRemoteRepoUtil({
        name,
        description: description ?? "",
        isPrivate: !!isPrivate,
        namespaceId: namespaceId ?? null,
      });
      return res;
    } catch (err) {
      console.error("[GitLab] createRemoteRepo error:", err);
      return { success: false, error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("gitlab-push-repo", async (_event, args) => {
    try {
      const { localPath, remoteUrl, branch } = args || {};
      if (!localPath || !remoteUrl)
        throw new Error("localPath and remoteUrl required");
      const res = await pushLocalToRemoteUtil(
        String(localPath),
        String(remoteUrl),
        String(branch ?? "main")
      );
      return res;
    } catch (err) {
      console.error("[GitLab] pushLocalToRemote error:", err);
      return { success: false, error: err.message ?? String(err) };
    }
  });
}
