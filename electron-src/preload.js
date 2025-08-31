const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("obsAPI", {
  onRecord: (cb) => ipcRenderer.on("record-state", (e, v) => cb(v)),
  onMute: (cb) => ipcRenderer.on("mute-state", (e, v) => cb(v)),
  onScene: (cb) => ipcRenderer.on("scene-state", (e, v) => cb(v)),
  onPot: (cb) => ipcRenderer.on("pot-update", (e, v) => cb(v)),
  onStream: (cb) => ipcRenderer.on("stream-state", (e, v) => cb(v)),
  onObsConnected: (cb) => ipcRenderer.on("obs-connected", (e, ok) => cb(ok)),

  listSerialPorts: () => ipcRenderer.invoke("list-serial-ports"),
  connectSerialPort: (path) => ipcRenderer.invoke("connect-serial-port", path),
  disconnectSerialPort: () => ipcRenderer.invoke("disconnect-serial-port"),
  writeSerial: (line) => ipcRenderer.invoke("serial-write", line),

  onSerialPorts: (cb) => ipcRenderer.on("serial-ports", (e, ports) => cb(ports)),
  onSerialData: (cb) => ipcRenderer.on("serial-data", (e, data) => cb(data)),
  onSerialOpen: (cb) => ipcRenderer.on("serial-open", (e, open) => cb(open)),
  onSerialConnectResult: (cb) => ipcRenderer.on("serial-connect", (e, info) => cb(info)),
  onSerialError: (cb) => ipcRenderer.on("serial-error", (e, err) => cb(err)),
});
