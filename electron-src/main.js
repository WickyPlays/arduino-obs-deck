const { app, BrowserWindow } = require("electron");
const path = require("path");
const OBSWebSocket = require("obs-websocket-js").default;
const { SerialPort, ReadlineParser } = require("serialport");

const obs = new OBSWebSocket();
const port = new SerialPort({ path: "COM5", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\r\n" }));

let mainWindow;
let currentSceneName = "";
let currentSceneIndex = 0;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: { preload: path.join(__dirname, "preload.js") },
  });
  mainWindow.setMenu(null);
  return mainWindow.loadFile("index.html");
}

function sendRGB(group, r, g, b) {
  port.write(`${group}${r ? 1 : 0}${g ? 1 : 0}${b ? 1 : 0}\n`);
}

function colorForSceneIndex(i) {
  if (i === 1) return [1,0,0];
  if (i === 2) return [0,1,0];
  if (i === 3) return [0,0,1];
  if (i === 4) return [0,1,1];
  if (i === 5) return [1,0,1];
  if (i === 6) return [1,1,0];
  return [0,0,0];
}

async function resolveSceneNameByPrefix(prefix) {
  const list = await obs.call("GetSceneList");
  const found = list.scenes.find(s => typeof s.sceneName === "string" && s.sceneName.startsWith(prefix));
  return found ? found.sceneName : null;
}

function sceneIndexFromName(name) {
  const m = /^Scene([1-6])_/.exec(name || "");
  return m ? parseInt(m[1], 10) : 0;
}

async function setSceneByIndex(i) {
  const prefix = `Scene${i}_`;
  const name = await resolveSceneNameByPrefix(prefix);
  if (name) {
    await obs.call("SetCurrentProgramScene", { sceneName: name });
  }
}

app.whenReady().then(createWindow);
app.on("window-all-closed", () => { if (process.platform !== "darwin") app.quit(); });

(async () => {
  try {
    await obs.connect("ws://localhost:4455", "hagXJUyWr4Qo4q5s");
    const rec = await obs.call("GetRecordStatus");
    sendRGB("r", rec.outputActive ? 1 : 0, 0, 0);
    const mute = await obs.call("GetInputMute", { inputName: "Mic/Aux" }).catch(() => ({ inputMuted: false }));
    sendRGB("m", mute.inputMuted ? 1 : 0, mute.inputMuted ? 0 : 1, 0);
    const cur = await obs.call("GetCurrentProgramScene");
    currentSceneName = cur.currentProgramSceneName;
    currentSceneIndex = sceneIndexFromName(currentSceneName);
    const [sr, sg, sb] = colorForSceneIndex(currentSceneIndex);
    sendRGB("c", sr, sg, sb);
    if (mainWindow) {
      mainWindow.webContents.send("record-state", rec.outputActive);
      mainWindow.webContents.send("mute-state", mute.inputMuted);
      mainWindow.webContents.send("scene-state", currentSceneName);
    }
  } catch (e) {}
})();

parser.on("data", async (data) => {
  try {
    if (data === "BTN-RECORD") {
      await obs.call("ToggleRecord");
    } else if (data === "BTN-SFX") {
      await obs.call("TriggerMediaInputAction", { inputName: "GG", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_STOP" });
      await obs.call("TriggerMediaInputAction", { inputName: "GG", mediaAction: "OBS_WEBSOCKET_MEDIA_INPUT_ACTION_RESTART" });
    } else if (data === "BTN-MUTE") {
      await obs.call("ToggleInputMute", { inputName: "Mic/Aux" });
    } else if (/^BTN-SCENE[1-6]$/.test(data)) {
      const idx = parseInt(data.replace("BTN-SCENE",""), 10);
      await setSceneByIndex(idx);
    } else if (data.startsWith("VOL:")) {
      const voltage = parseFloat(data.split(":")[1]);
      const volume = Math.max(0, Math.min(1, voltage / 4.57));
      await obs.call("SetInputVolume", { inputName: "Desktop Audio", inputVolumeMul: volume });
      if (mainWindow) mainWindow.webContents.send("pot-update", { voltage, volume });
    }
  } catch (e) {}
});

obs.on("RecordStateChanged", (d) => {
  sendRGB("r", d.outputActive ? 1 : 0, 0, 0);
  if (mainWindow) mainWindow.webContents.send("record-state", d.outputActive);
});

obs.on("InputMuteStateChanged", (d) => {
  if (d.inputName === "Mic/Aux") {
    sendRGB("m", d.inputMuted ? 1 : 0, d.inputMuted ? 0 : 1, 0);
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
