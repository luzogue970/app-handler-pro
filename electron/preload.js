const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  getRepos: () => ipcRenderer.invoke("get-repos"),
  openInVSCode: (path) => ipcRenderer.send("open-vscode", path),
  launchApp: (path, commands) =>
    ipcRenderer.send("launch-app", { path, commands }),
});

contextBridge.exposeInMainWorld("github", {
  getAuthStatus: () => ipcRenderer.invoke("github-get-status"),
  login: () => ipcRenderer.invoke("github-login"),
  logout: () => ipcRenderer.invoke("github-logout"),
  listRepos: () => ipcRenderer.invoke("github-list-repos"),
  startDeviceFlow: () => ipcRenderer.invoke("github-start-device-flow"),
  completeDeviceLogin: (deviceCode, interval, expiresIn) =>
    ipcRenderer.invoke("github-complete-device-login", {
      deviceCode,
      interval,
      expiresIn,
    }),
  pullProject: (remote) => ipcRenderer.invoke("github-pull-repo", { remote }),
  createRemoteRepo: (name, description, priavtee) =>
    ipcRenderer.invoke("github-create-repo", name, description, priavtee),
  pushLocalToRemote: (localPath, remoteUrl, branch) =>
    ipcRenderer.invoke("github-push-repo", localPath, remoteUrl, branch),
});

contextBridge.exposeInMainWorld("gitlab", {
  getAuthStatus: () => ipcRenderer.invoke("gitlab-get-status"),
  loginWithToken: (host, token) =>
    ipcRenderer.invoke("gitlab-login-token", { host, token }),
  logout: () => ipcRenderer.invoke("gitlab-logout"),
  listRepos: () => ipcRenderer.invoke("gitlab-list-repos"),
});
