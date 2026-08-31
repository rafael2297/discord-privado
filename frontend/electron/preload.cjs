const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  listNetworkInterfaces: () => ipcRenderer.invoke("list-network-interfaces"),
  startBackend: (env) => ipcRenderer.invoke("start-backend", env),
  stopBackend: () => ipcRenderer.invoke("stop-backend"),
  startLiveKit: (nodeIp) => ipcRenderer.invoke("start-livekit", nodeIp),
  stopLiveKit: () => ipcRenderer.invoke("stop-livekit"),
  getDesktopSources: () => ipcRenderer.invoke("get-desktop-sources"),
  setScreenShareSource: (id) => ipcRenderer.invoke("set-screen-share-source", id),
  focusWindow: () => ipcRenderer.invoke("focus-window"),
  onHostLog: (callback) => {
    const listener = (_event, line) => callback(line);
    ipcRenderer.on("host-log", listener);
    // devolve uma função pra remover o listener depois, evitando duplicar
    // se o componente re-registrar em outra tentativa de hospedar.
    return () => ipcRenderer.removeListener("host-log", listener);
  },
});
