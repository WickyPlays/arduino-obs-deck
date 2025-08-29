const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("obsAPI", {
  onPot: (cb) => ipcRenderer.on("pot-update", (e, data) => cb(data)),
  onRecord: (cb) => ipcRenderer.on("record-state", (e, active) => cb(active)),
  onMute: (cb) => ipcRenderer.on("mute-state", (e, muted) => cb(muted)),
  onScene: (cb) => ipcRenderer.on("scene-state", (e, scene) => cb(scene)),
});
