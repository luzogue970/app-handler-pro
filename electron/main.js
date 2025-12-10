import { app, BrowserWindow } from "electron";
import path from "node:path";

import ReposIPCInit from "./ipc/localReposIPC.js";
import GithubIPCInit from "./ipc/githubIPC.js";
import GitLabIPCInit from "./ipc/gitlabIPC.js";
const startUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(process.cwd(), "preload.js"),

      contextIsolation: true,

      nodeIntegration: false,
    },
  });

  if (app.isPackaged) {
    win.loadFile(path.join(process.cwd(), "dist/index.html"));
  } else {
    win.loadURL(startUrl);
  }

  if (!app.isPackaged) {
    const loadUrlWithRetry = (url, retries = 10) => {
      win.loadURL(url).catch((err) => {
        if (retries > 0) {
          console.log(
            `Failed to load URL, retrying... (${retries} retries left)`
          );
          setTimeout(() => loadUrlWithRetry(url, retries - 1), 1000);
        } else {
          console.error("Failed to load URL after multiple attempts:", err);
        }
      });
    };
    loadUrlWithRetry(startUrl);
  } else {
    win.loadFile(path.join(__dirname, "../front/dist/index.html"));
  }

  win.webContents.openDevTools();
  return win;
};

ReposIPCInit();
GithubIPCInit();
GitLabIPCInit();

app.whenReady().then(() => {
  createWindow();
});
