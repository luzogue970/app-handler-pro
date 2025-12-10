import { ipcMain } from "electron";
import {
  completeDeviceLogin,
  createRemoteRepo,
  getAuthStatus,
  listUserRepos,
  login,
  logout,
  pullRepo,
  pushLocalToRemote,
  startDeviceFlow,
} from "../utils/github.js";
export default function GithubIPCInit() {
  ipcMain.handle("github-get-status", async () => {
    return getAuthStatus();
  });

  ipcMain.handle("github-login", async () => {
    try {
      const status = await login();
      return status;
    } catch (err) {
      console.error("[GitHub] login error:", err);
      return { connected: false, error: err.message };
    }
  });

  ipcMain.handle("github-logout", async () => {
    return logout();
  });

  ipcMain.handle("github-list-repos", async () => {
    try {
      return await listUserRepos();
    } catch (err) {
      console.error("[GitHub] listUserRepos error:", err);
      return { error: err.message };
    }
  });

  ipcMain.handle("github-start-device-flow", async () => {
    try {
      return await startDeviceFlow();
    } catch (err) {
      console.error("[GitHub] startDeviceFlow error:", err);
      return { error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("github-complete-device-login", async (_event, args) => {
    try {
      const { deviceCode, interval, expiresIn } = args || {};
      return await completeDeviceLogin(deviceCode, interval, expiresIn);
    } catch (err) {
      console.error("[GitHub] completeDeviceLogin error:", err);
      return { error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("github-pull-repo", async (_event, args) => {
    try {
      const { remote } = args || {};
      return await pullRepo(remote);
    } catch (err) {
      console.error("[GitHub] pullRepo error:", err);
      return { error: err.message ?? String(err) };
    }
  });

  ipcMain.handle("github-create-repo", async (_event, args) => {
    console.log("ici info create ipc: " + args);

    try {
      const res = await createRemoteRepo(args || {});
      return { success: true, data: res };
    } catch (err) {
      console.error("[GitHub] createRemoteRepo error:", err);
      return { success: false, error: err?.message ?? String(err) };
    }
  });

  ipcMain.handle("github-push-repo", async (_event, args) => {
    console.log("ici info push ipc: " + args);

    try {
      const res = await pushLocalToRemote( args || {});
      return res;
    } catch (err) {
      console.error("[GitHub] pushLocalToRemote error:", err);
      return { success: false, error: err?.message ?? String(err) };
    }
  });
}
