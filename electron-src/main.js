const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { SerialPort, ReadlineParser } = require("serialport");

const obs = new OBSWebSocket();

let mainWindow = null;
let serialPort = null;
let parser = null;

let currentSceneName = "";
let currentSceneIndex = 0;

let initialSynced = false;
let obsConnectedFlag = false;
let serialOpenFlag = false;

function sendToSerial(line) {
  if (!serialPort || !serialPort.writable) return;
  try {
    serialPort.write(line + "\n");
  } catch (e) {
    if (mainWindow) mainWindow.webContents.send("serial-error", String(e));
  }
}

function sendRGB(group, r, g, b) {
  sendToSerial(`${group}${r ? 1 : 0}${g ? 1 : 0}${b ? 1 : 0}`);
}

function colorForSceneIndex(i) {
  if (i === 1) return [1, 0, 0];
  if (i === 2) return [0, 1, 0];
  if (i === 3) return [0, 0, 1];
  if (i === 4) return [0, 1, 1];
  if (i === 5) return [1, 0, 1];
  if (i === 6) return [1, 1, 0];
  return [0, 0, 0];
}

function sceneIndexFromName(name) {
  const m = /^Scene([1-6])_/.exec(name || "");
  return m ? parseInt(m[1], 10) : 0;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true
    },
  });
  mainWindow.setMenu(null);
  mainWindow.loadFile("index.html");
}

async function detectStreamPlatform() {
  try {
    const resp = await obs.call("GetStreamServiceSettings");
    const s = JSON.stringify(resp).toLowerCase();
    if (s.includes("twitch")) return "twitch";
    if (s.includes("youtube")) return "youtube";
    return "other";
  } catch (e) {
    return "other";
  }
}

async function initialSyncSequence() {
  if (!mainWindow || !serialPort || !serialPort.isOpen || !obsConnectedFlag || initialSynced) return;
  try {
    const cur = await obs.call("GetCurrentProgramScene");
    currentSceneName = cur.currentProgramSceneName || "";
    currentSceneIndex = sceneIndexFromName(currentSceneName);
    const [sr, sg, sb] = colorForSceneIndex(currentSceneIndex);
    sendRGB("c", sr, sg, sb);
    await new Promise(r => setTimeout(r, 200));
    const mute = await obs.call("GetInputMute", { inputName: "Mic/Aux" }).catch(()=>({ inputMuted: false }));
    sendRGB("m", mute.inputMuted ? 0 : 1, 0, 0);
    await new Promise(r => setTimeout(r, 80));
    const rec = await obs.call("GetRecordStatus").catch(()=>({ outputActive: false }));
    sendRGB("r", rec.outputActive ? 1 : 0, 0, 0);
    await new Promise(r => setTimeout(r, 80));
    const platform = await detectStreamPlatform();
    const streamStatus = await obs.call("GetStreamingStatus").catch(()=>({ outputActive: false }));
    const streaming = !!(streamStatus.outputActive || streamStatus.streaming || streamStatus.isStreaming);
    if (platform === "twitch") {
      sendRGB("t", streaming ? 1 : 0, 0, streaming ? 1 : 0);
    } else if (platform === "youtube") {
      sendRGB("t", streaming ? 1 : 0, 0, 0);
    } else {
      sendRGB("t", streaming ? 1 : 0, 0, 0);
    }
    if (mainWindow) mainWindow.webContents.send("scene-state", currentSceneName);
    if (mainWindow) mainWindow.webContents.send("record-state", rec.outputActive);
    if (mainWindow) mainWindow.webContents.send("stream-state", streaming);
    if (mainWindow) mainWindow.webContents.send("mute-state", mute.inputMuted);
    initialSynced = true;
  } catch (e) {
    initialSynced = true;
  }
}

app.whenReady().then(async () => {
  createWindow();

  try {
    const ports = await SerialPort.list();
    mainWindow.webContents.once('did-finish-load', () => {
      mainWindow.webContents.send("serial-ports", ports.map(p => ({ path: p.path, manufacturer: p.manufacturer })));
    });

    if (ports && ports.length) {
      tryConnectPort(ports[0].path);
    }
  } catch (e) {
  }

  try {
    await obs.connect("ws://localhost:4455", "hagXJUyWr4Qo4q5s");
    obsConnectedFlag = true;
    mainWindow.webContents.send("obs-connected", true);

    const rec = await obs.call("GetRecordStatus");
    await new Promise(r => setTimeout(r, 0));
    const streamStatus = await obs.call("GetStreamingStatus").catch(()=>({ outputActive: false }));
    const streaming = !!(streamStatus.outputActive || streamStatus.streaming || streamStatus.isStreaming);
    const mute = await obs.call("GetInputMute", { inputName: "Mic/Aux" }).catch(() => ({ inputMuted: false }));
    const cur = await obs.call("GetCurrentProgramScene");
    currentSceneName = cur.currentProgramSceneName || "";
    currentSceneIndex = sceneIndexFromName(currentSceneName);

    await initialSyncSequence();
    if (mainWindow) mainWindow.webContents.send("record-state", rec.outputActive);
    if (mainWindow) mainWindow.webContents.send("stream-state", streaming);
    if (mainWindow) mainWindow.webContents.send("mute-state", mute.inputMuted);
    if (mainWindow) mainWindow.webContents.send("scene-state", currentSceneName);
  } catch (e) {
    if (mainWindow) mainWindow.webContents.send("obs-connected", false);
  }
});

app.on("window-all-closed", () => {
  if (serialPort && serialPort.isOpen) serialPort.close();
  if (process.platform !== "darwin") app.quit();
});

async function tryConnectPort(portPath) {
  if (serialPort && serialPort.isOpen) {
    try { serialPort.close(); } catch (e) {}
    serialPort = null;
    parser = null;
  }

  try {
    serialPort = new SerialPort({ path: portPath, baudRate: 9600, autoOpen: false });
    serialPort.open((err) => {
      if (err) {
        if (mainWindow) mainWindow.webContents.send("serial-connect", { ok: false, error: String(err) });
        return;
      }
      parser = serialPort.pipe(new ReadlineParser({ delimiter: "\r\n" }));
      mainWindow.webContents.send("serial-connect", { ok: true, port: portPath });
      attachSerialHandlers();
      serialOpenFlag = true;
      initialSynced = false;
      setTimeout(()=> initialSyncSequence(), 120);
    });
  } catch (e) {
    if (mainWindow) mainWindow.webContents.send("serial-connect", { ok: false, error: String(e) });
  }
}

function attachSerialHandlers() {
  if (!parser) return;

  parser.on("data", async (line) => {
    if (mainWindow) mainWindow.webContents.send("serial-data", line);

    try {
      if (!initialSynced) return;
      if (line === "BTN-RECORD") {
        await obs.call("ToggleRecord");
      } else if (line === "BTN-SFX") {
        await obs.call("TriggerMediaInputAction", {
          inputName: "GG",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP",
        }).catch(()=>{});
        await obs.call("TriggerMediaInputAction", {
          inputName: "GG",
          mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART",
        }).catch(()=>{});
      } else if (line === "BTN-MUTE") {
        await obs.call("ToggleInputMute", { inputName: "Mic/Aux" });
      } else if (line === "BTN-STREAM") {
        await obs.call("ToggleStream").catch(async (e)=>{
          try {
            const stat = await obs.call("GetStreamingStatus");
            const streaming = !!(stat.outputActive || stat.streaming || stat.isStreaming);
            if (streaming) {
              await obs.call("StopStream");
            } else {
              await obs.call("StartStream");
            }
          } catch (ee) {
          }
        });
      } else if (/^BTN-SCENE[1-6]$/.test(line)) {
        const idx = parseInt(line.replace("BTN-SCENE", ""), 10);
        const prefix = `Scene${idx}_`;
        try {
          const list = await obs.call("GetSceneList");
          const found = list.scenes.find(s => typeof s.sceneName === "string" && s.sceneName.startsWith(prefix));
          if (found) {
            await obs.call("SetCurrentProgramScene", { sceneName: found.sceneName });
          }
        } catch (e) {
        }
      } else if (line.startsWith("VOL:")) {
        const voltage = parseFloat(line.split(":")[1]);
        const volume = Math.max(0, Math.min(1, voltage / 4.57));
        await obs.call("SetInputVolume", {
          inputName: "Desktop Audio",
          inputVolumeMul: volume,
        }).catch(()=>{});
        if (mainWindow) mainWindow.webContents.send("pot-update", { voltage, volume });
      } else if (line === "BTN-A2") {
      } else if (line === "BTN-A3") {
      }
    } catch (e) {
    }
  });

  serialPort.on("open", () => {
    if (mainWindow) mainWindow.webContents.send("serial-open", true);
    serialOpenFlag = true;
    setTimeout(()=> initialSyncSequence(), 120);
  });

  serialPort.on("close", () => {
    if (mainWindow) mainWindow.webContents.send("serial-open", false);
    serialOpenFlag = false;
  });

  serialPort.on("error", (err) => {
    if (mainWindow) mainWindow.webContents.send("serial-error", String(err));
  });
}

obs.on("RecordStateChanged", (d) => {
  sendRGB("r", d.outputActive ? 1 : 0, 0, 0);
  if (mainWindow) mainWindow.webContents.send("record-state", d.outputActive);
});

obs.on("InputMuteStateChanged", (d) => {
  if (d.inputName === "Mic/Aux") {
    sendRGB("m", d.inputMuted ? 0 : 1, 0, 0);
    if (mainWindow) mainWindow.webContents.send("mute-state", d.inputMuted);
  }
});

obs.on("CurrentProgramSceneChanged", (d) => {
  currentSceneName = d.sceneName;
  currentSceneIndex = sceneIndexFromName(currentSceneName);
  const [sr, sg, sb] = colorForSceneIndex(currentSceneIndex);
  sendRGB("c", sr, sg, sb);
  if (mainWindow) mainWindow.webContents.send("scene-state", currentSceneName);
});

obs.on("StreamStateChanged", async (d) => {
  const streaming = !!(d.outputActive || d.streaming || d.isStreaming);
  const platform = await detectStreamPlatform();
  if (platform === "twitch") {
    sendRGB("t", streaming ? 1 : 0, 0, streaming ? 1 : 0);
  } else if (platform === "youtube") {
    sendRGB("t", streaming ? 1 : 0, 0, 0);
  } else {
    sendRGB("t", streaming ? 1 : 0, 0, 0);
  }
  if (mainWindow) mainWindow.webContents.send("stream-state", streaming);
});
obs.on("StreamStarted", async () => {
  const platform = await detectStreamPlatform();
  if (platform === "twitch") {
    sendRGB("t", 1, 0, 1);
  } else {
    sendRGB("t", 1, 0, 0);
  }
  if (mainWindow) mainWindow.webContents.send("stream-state", true);
});
obs.on("StreamStopped", () => {
  sendRGB("t", 0, 0, 0);
  if (mainWindow) mainWindow.webContents.send("stream-state", false);
});

ipcMain.handle("list-serial-ports", async () => {
  try {
    const ports = await SerialPort.list();
    return { ok: true, ports };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("connect-serial-port", async (evt, portPath) => {
  try {
    await tryConnectPort(portPath);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("disconnect-serial-port", async () => {
  try {
    if (serialPort && serialPort.isOpen) await serialPort.close();
    serialPort = null;
    parser = null;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});

ipcMain.handle("serial-write", async (evt, line) => {
  try {
    sendToSerial(line);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
});
